/**
 * A product record available to the current team.
 * Mirrors the iOS `GRDBProduct` Swift model's `toJSON()` output.
 */
export interface Product {
    id: number
    team_id: number
    name: string
    slug: string
    external_id: string
    status: string
    is_active: boolean
    is_external: boolean
    is_editable: boolean
    created_at: string
    updated_at: string
    /** IDs of presentations associated with this product. */
    presentation_ids: number[]
}
