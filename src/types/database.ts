/**
 * The result of a `mobilelocker.database.query()` call.
 */
export interface DatabaseQueryResult {
    /** Array of row objects, one per result row. Keys are column names. */
    rows: Record<string, unknown>[]
    /** Number of rows affected by the statement (always `0` for SELECT queries). */
    rows_affected: number
    /** Row ID of the last inserted row, or `null` for SELECT statements. */
    last_insert_row_id: number | null
}

/**
 * Metadata for a single column returned by `mobilelocker.database.describe()`.
 */
export interface DatabaseColumnInfo {
    /** Column index (0-based), as reported by `PRAGMA table_info`. */
    cid: number
    name: string
    /** SQLite type affinity (e.g. `'TEXT'`, `'INTEGER'`, `'REAL'`, `'BLOB'`). */
    type: string
    /** Whether the column has a `NOT NULL` constraint. */
    not_null: boolean
    /** Default value expression, or `null` if none is defined. */
    default_value: string | null
    /** Whether this column is part of the primary key. */
    primary_key: boolean
}

/**
 * Schema description of a SQLite table, returned by `mobilelocker.database.describe()`.
 */
export interface DatabaseTableDescription {
    /** Canonical table name as stored in `sqlite_master`. */
    name: string
    /** Original `CREATE TABLE` SQL statement. */
    sql: string
    /** Ordered list of column descriptors. */
    columns: DatabaseColumnInfo[]
}
