/**
 * A brand associated with a team's presentations.
 * Mirrors the iOS `GRDBBrand` Swift model's `toJSON()` output.
 */
export interface Brand {
    id: number
    team_id: number
    name: string
    /** URL-safe identifier for the brand. */
    slug: string
    status: string
    is_active: boolean
    is_inactive: boolean
}
