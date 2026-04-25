/**
 * A label that can be applied to presentations for categorisation.
 * Mirrors the iOS `GRDBLabel` Swift model's `toJSON()` output.
 */
export interface Label {
    id: number
    name: string
    /** URL-safe identifier for the label. */
    slug: string
    team_id: number
    /** IDs of presentations tagged with this label. */
    presentation_ids: number[]
}
