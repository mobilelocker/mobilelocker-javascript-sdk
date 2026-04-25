export interface DatabaseQueryResult {
    rows: Record<string, unknown>[]
    rowsAffected: number
    lastInsertRowId: number | null
}

export interface DatabaseColumnInfo {
    cid: number
    name: string
    type: string
    notNull: boolean
    defaultValue: string | null
    primaryKey: boolean
}

export interface DatabaseTableDescription {
    name: string
    sql: string
    columns: DatabaseColumnInfo[]
}
