/**
 * An event attendee captured via badge scan or lead retrieval.
 * Mirrors the iOS `GRDBAttendee` Swift model's `toJSON()` output.
 */
export interface Attendee {
    id: string
    team_id: number
    event_id: number
    user_id: number
    type: string
    salutation: string
    first_name: string
    last_name: string
    name: string
    slug: string
    degree: string
    company: string
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
    /** Legacy alias for `postal_code` — kept for backward compatibility with JS slides. */
    zip_code: string
    country: string
    note: string
    status: string
    source: string
    crm_object_type: string
    crm_object_id: string
    crm_object: string
    form_response_id: number | null
    card_id: string | null
    badge_id: string | null
    linkedin_url: string
    mobilelocker_url: string | null
    clearbit_id: string
    /** Decoded Clearbit person data, or `null` if unavailable. */
    clearbit_data: object | null
    /** Decoded Clearbit company data, or `null` if unavailable. */
    clearbit_company_data: object | null
    /** Decoded supplemental data blob, or `null` if unavailable. */
    data: object | null
    checked_in_by_id: number | null
    checked_in_at: string | null
    checked_out_at: string | null
    declined_at: string | null
    created_at: string
    updated_at: string
    user_contact_id: number | null
}
