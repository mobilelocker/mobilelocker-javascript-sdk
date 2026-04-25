/**
 * A lead retrieval event (congress, conference, or trade show).
 * Mirrors the iOS `GRDBEvent` Swift model's `toJSON()` output.
 */
export interface Event {
    id: number
    name: string
    slug: string
    team_id: number
    owner_id: number
    /** ID of the lead capture form associated with this event. */
    form_id: number
    /** Lead retrieval provider (e.g. `'cvent'`, `'a2z'`). */
    provider: string
    /** Event classification (e.g. `'congress'`, `'tradeshow'`). */
    event_type: string
    status: string
    location: string
    timezone: string
    /** ISO 8601 start date/time. */
    start_at: string
    /** ISO 8601 end date/time. */
    end_at: string
    created_at: string
    updated_at: string
    /** CRM object type for synced leads (e.g. `'Lead'`, `'Contact'`). */
    crm_object_type: string | null
    /** CRM record ID this event maps to. */
    crm_object_id: string | null
    /** Provider-assigned external event ID. */
    external_id: string | null
    /** CRM campaign ID for lead association. */
    crm_campaign_id: string | null
}
