/**
 * A business card captured via camera scan.
 * Mirrors the iOS `BusinessCardData` Swift DTO.
 */
export interface BusinessCard {
    id: string
    httpStatus: number
    teamID: number
    userID: number
    /** Lead retrieval event this card was scanned at, if any. */
    eventID: number
    /** Associated attendee ID, if the card was linked to a badge scan. */
    attendeeID: string
    /** URL to the scanned card image. */
    url: string
    /** CRM record ID this card was matched to. */
    crmID: string
    /** CRM object type (e.g. `'Contact'`, `'Lead'`). */
    crmObjectType: string
    /** How the card was captured (e.g. `'scan'`, `'manual'`). */
    source: string
    /** Whether the card data has been verified against CRM records. */
    verified: boolean
    createdAt: string
    updatedAt: string
    firstName: string | null
    lastName: string | null
    email: string | null
    name: string | null
    company: string | null
    phone: string | null
    jobTitle: string | null
}
