/**
 * A lead retrieval event (congress, conference, or trade show).
 * Mirrors the iOS `EventData` Swift DTO.
 */
export interface Event {
    id: number
    teamID: number
    ownerID: number
    /** ID of the lead capture form associated with this event. */
    formID: number
    /** Lead retrieval provider (e.g. `'cvent'`, `'a2z'`). */
    provider: string
    /** Event classification (e.g. `'congress'`, `'tradeshow'`). */
    eventType: string
    status: string
    /** CRM object type for synced leads (e.g. `'Lead'`, `'Contact'`). */
    crmObjectType: string | null
    /** CRM campaign ID this event maps to. */
    crmObjectID: string | null
    /** Provider-assigned external event ID. */
    externalID: string | null
    /** CRM campaign ID for lead association. */
    crmCampaignID: string | null
    name: string
    slug: string
    website: string
    location: string
    /** ISO 8601 start date/time. */
    startAt: string
    /** ISO 8601 end date/time. */
    endAt: string
    timezone: string
    createdAt: string
    updatedAt: string
}
