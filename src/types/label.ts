/**
 * A label that can be applied to presentations for categorisation.
 * Mirrors the iOS `LabelData` Swift DTO.
 */
export interface Label {
    id: number
    name: string
    /** URL-safe identifier for the label. */
    slug: string
    teamId: number
}
