import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { MobileLockerDatabaseError, DatabaseErrorCode } from '../errors'
import type { DatabaseQueryResult, DatabaseTableDescription, DatabaseColumnInfo } from '../types/database'
import axios from 'axios'

function isOfflineError(err: unknown): boolean {
    return err instanceof TypeError && (
        (err as TypeError).message.includes('Failed to fetch') ||
        (err as TypeError).message.includes('NetworkError') ||
        (err as TypeError).message.includes('Network request failed')
    )
}

const _sqliteCache = new Map<string, unknown>()

async function _loadSqlJs(): Promise<unknown> {
    if (window.SQL) return window.SQL

    const SQL_JS_VERSION = '1.13.0'

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQL_JS_VERSION}/sql-wasm.js`
        script.onload = () => resolve()
        script.onerror = () => reject(new MobileLockerDatabaseError('No internet connection', DatabaseErrorCode.NotConnected))
        document.head.appendChild(script)
    })

    window.SQL = await window.initSqlJs!({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQL_JS_VERSION}/${file}`,
    })

    return window.SQL
}

async function _openDevDatabase(path: string): Promise<unknown> {
    if (_sqliteCache.has(path)) return _sqliteCache.get(path)

    const SQL = await _loadSqlJs() as { Database: new (data: Uint8Array) => unknown }

    let response: Response
    try {
        response = await fetch(path)
    } catch (err) {
        if (isOfflineError(err)) throw new MobileLockerDatabaseError('No internet connection', DatabaseErrorCode.NotConnected)
        throw err
    }
    if (!response.ok) {
        throw new MobileLockerDatabaseError(
            `Could not fetch database at '${path}': ${response.status} ${response.statusText}`,
            DatabaseErrorCode.InvalidPath,
        )
    }

    const buffer = await response.arrayBuffer()
    const db = new SQL.Database(new Uint8Array(buffer))
    _sqliteCache.set(path, db)
    return db
}

function _normaliseParams(params: unknown[] | Record<string, unknown>): unknown {
    if (Array.isArray(params)) return params
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(params)) {
        result[/^[:@$]/.test(key) ? key : `:${key}`] = value
    }
    return result
}

type SqlJsStatement = {
    bind: (p: unknown) => void
    step: () => boolean
    getAsObject: () => Record<string, unknown>
    free: () => void
}

type SqlJsDb = { prepare: (sql: string) => SqlJsStatement }

function toError(err: unknown): MobileLockerDatabaseError {
    if (err instanceof MobileLockerDatabaseError) return err
    if (axios.isAxiosError(err)) {
        if (!err.response) return new MobileLockerDatabaseError('No internet connection', DatabaseErrorCode.NotConnected)
        const status = err.response.status
        const msg = (err.response.data as { error?: string })?.error ?? err.message
        if (status === 400) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.InvalidPath)
        if (status === 403) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.WriteNotPermitted)
        if (status === 503) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.NotReady)
        return new MobileLockerDatabaseError(msg, DatabaseErrorCode.QueryFailed)
    }
    return new MobileLockerDatabaseError(String(err), DatabaseErrorCode.QueryFailed)
}

export const database = {
    /**
     * List the SQLite database files available to the current presentation.
     *
     * @remarks Returns an empty array outside the Mobile Locker app.
     * @returns Array of database file path strings.
     * @throws {@link MobileLockerDatabaseError} on network failure or server error.
     */
    async list(): Promise<string[]> {
        if (!isMobileLocker()) return []
        try {
            const { data } = await withRetry(() => apiClient.get<{ databases: string[] }>(getEndpoint('/database/list')))
            return data.databases ?? []
        } catch (err) { throw toError(err) }
    },

    /**
     * Describe the schema of a table in a SQLite database.
     *
     * In local development, falls back to sql.js and reads the schema directly
     * from the database file via `PRAGMA table_info`.
     *
     * @param database - Path to the `.sqlite` file (relative to the presentation root).
     * @param table - Name of the table to inspect.
     * @returns A {@link DatabaseTableDescription} with `name`, `sql`, and `columns`.
     * @throws {@link MobileLockerDatabaseError} with code `InvalidPath` if the table does not exist.
     *
     * @example
     * const schema = await mobilelocker.database.describe('data/products.sqlite', 'products')
     * console.log(schema.columns.map(c => c.name))
     */
    async describe(database: string, table: string): Promise<DatabaseTableDescription> {
        if (isMobileLocker()) {
            try {
                const { data } = await withRetry(() =>
                    apiClient.get<DatabaseTableDescription>(getEndpoint('/database/describe'), {
                        params: { database, table },
                    }),
                )
                return data
            } catch (err) { throw toError(err) }
        }

        // Dev fallback: sql.js
        // Look up the table via sqlite_master (parameterised), then use the canonical
        // name in the PRAGMA — same safe pattern as the iOS implementation.
        try {
            const db = await _openDevDatabase(database) as SqlJsDb

            const masterStmt = db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name = ?")
            masterStmt.bind([table])
            if (!masterStmt.step()) {
                masterStmt.free()
                throw new MobileLockerDatabaseError(`Table '${table}' not found in '${database}'`, DatabaseErrorCode.InvalidPath)
            }
            const masterRow = masterStmt.getAsObject() as { name: string; sql: string }
            masterStmt.free()

            const pragmaStmt = db.prepare(`PRAGMA table_info("${masterRow.name}")`)
            const columns: DatabaseColumnInfo[] = []
            while (pragmaStmt.step()) {
                const r = pragmaStmt.getAsObject() as {
                    cid: number; name: string; type: string
                    notnull: number; dflt_value: string | null; pk: number
                }
                columns.push({
                    cid: r.cid,
                    name: r.name,
                    type: r.type,
                    notNull: r.notnull !== 0,
                    defaultValue: r.dflt_value ?? null,
                    primaryKey: r.pk !== 0,
                })
            }
            pragmaStmt.free()

            return { name: masterRow.name, sql: masterRow.sql, columns }
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Execute a SQL SELECT query against a SQLite database embedded in the presentation.
     *
     * In local development, falls back to sql.js and fetches the database file directly.
     * Only SELECT statements are permitted — write operations throw `WriteNotPermitted`.
     *
     * @param path - Path to the `.sqlite` file (relative to the presentation root).
     * @param sql - A SQL SELECT statement, optionally with `?` or `:name` placeholders.
     * @param parameters - Positional array or named object of bind parameters.
     * @returns A {@link DatabaseQueryResult} with `rows`, `rowsAffected`, and `lastInsertRowId`.
     * @throws {@link MobileLockerDatabaseError} with codes `InvalidPath`, `WriteNotPermitted`,
     *   `NotReady`, `QueryFailed`, or `NotConnected`.
     *
     * @example
     * const result = await mobilelocker.database.query(
     *   'data/products.sqlite',
     *   'SELECT * FROM products WHERE category = ?',
     *   ['widgets']
     * )
     * result.rows.forEach(row => console.log(row.name))
     */
    async query(
        path: string,
        sql: string,
        parameters: unknown[] | Record<string, unknown> = [],
    ): Promise<DatabaseQueryResult> {
        if (isMobileLocker()) {
            try {
                const { data } = await withRetry(() =>
                    apiClient.post<DatabaseQueryResult>(getEndpoint('/database/query'), { database: path, sql, parameters }),
                )
                return data
            } catch (err) { throw toError(err) }
        }

        // Dev fallback: sql.js
        try {
            const db = await _openDevDatabase(path) as SqlJsDb
            const stmt = db.prepare(sql)
            stmt.bind(_normaliseParams(parameters))
            const rows: Record<string, unknown>[] = []
            while (stmt.step()) rows.push(stmt.getAsObject())
            stmt.free()
            return { rows, rowsAffected: 0, lastInsertRowId: null }
        } catch (err) {
            throw toError(err)
        }
    },
}
