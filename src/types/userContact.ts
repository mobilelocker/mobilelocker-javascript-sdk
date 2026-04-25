/**
 * A contact from the current user's personal contact list.
 * Mirrors the iOS `GRDBUserContact` Swift model's `toJSON()` output.
 */
export interface UserContact {
    id: number
    team_id: number
    user_id: number
    uuid: string
    status: string
    source: string
    greeting_type: string
    greeting: string | null
    salutation: string
    suffix: string | null
    initials: string | null
    first_name: string
    last_name: string
    name: string
    slug: string
    title: string
    designation: string
    specialty: string
    industry: string
    email: string
    phone: string
    mobile_phone: string
    address: string
    street1: string
    street2: string
    city: string
    state: string
    postal_code: string
    country: string
    linkedin_url: string
    external_id: string
    contact_type: string
    territory: string
    note: string
    company_name: string
    /** National Provider Identifier (US healthcare). */
    npi: string | null
    level: string
    tier: string
    segment: string
    lead_source: string
    /** Connected CRM provider name (e.g. `'salesforce'`). */
    crm_provider: string | null
    /** CRM object type (e.g. `'Contact'`, `'Lead'`). */
    crm_object: string
    crm_object_id: string | null
    email_deliverability_status: string | null
    can_be_deleted: boolean
    last_contacted_at: string | null
    synced_at: string | null
    created_at: string | null
    updated_at: string | null
}
