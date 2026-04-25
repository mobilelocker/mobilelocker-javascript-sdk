/**
 * A brand associated with a team's presentations.
 * Mirrors the iOS `BrandData` Swift DTO.
 */
export interface Brand {
    id: number
    teamID: number
    name: string
    /** URL-safe identifier for the brand. */
    slug: string
    status: string
    isActive: boolean
    isInactive: boolean
}
