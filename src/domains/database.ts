import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { MobileLockerDatabaseError, DatabaseErrorCode } from '../errors'
import type { DatabaseQueryResult } from '../types/database'
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

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new MobileLockerDatabaseError('No internet connection', DatabaseErrorCode.NotConnected))
        document.head.appendChild(script)
    })

    window.SQL = await window.initSqlJs!({
        locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
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
    async list(): Promise<string[]> {
        if (!isMobileLocker()) return []
        try {
            const { data } = await withRetry(() => apiClient.get<{ databases: string[] }>(getEndpoint('/database/list')))
            return data.databases ?? []
        } catch (err) { throw toError(err) }
    },

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
            const db = await _openDevDatabase(path) as {
                prepare: (sql: string) => { bind: (p: unknown) => void; step: () => boolean; getAsObject: () => Record<string, unknown>; free: () => void }
            }
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
