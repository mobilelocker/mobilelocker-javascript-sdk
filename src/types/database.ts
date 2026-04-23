export interface DatabaseQueryResult {
    rows: Record<string, unknown>[]
    rowsAffected: number
    lastInsertRowId: number | null
}
