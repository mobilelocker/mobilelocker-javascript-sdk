/**
 * A business card captured via camera scan.
 * Mirrors the iOS `GRDBBusinessCard` Swift model.
 */
export interface BusinessCard {
    id: string
    team_id: number
    user_id: number
    event_id: number
    /** Associated attendee ID if the card was linked to a badge scan. */
    attendee_id: string | null
    status: string
    /** How the card was captured (e.g. `'scan'`, `'manual'`). */
    source: string
    /** URL to the scanned card image. */
    url: string
    image_front_uri: string | null
    image_back_uri: string | null
    image_front_url: string | null
    image_back_url: string | null
    first_name: string
    last_name: string
    /** Full name as parsed by OCR. */
    name: string
    email: string
    /** Job title from the scanned card. Also available as `title` (legacy alias). */
    job_title: string
    title: string
    company: string
    phone: string
    website: string
    address: string
    /** CRM record ID this card was matched to. */
    crm_id: string
    /** CRM object type (e.g. `'Contact'`, `'Lead'`). */
    crm_object_type: string
    /** Whether the card data has been verified against CRM records. */
    verified: boolean
    /** Raw JSON string of the original scanned data. */
    raw_string: string
    http_status: number
    created_at: string | null
    updated_at: string | null
    // MLI-1332: Extended fields from the OCR scan result
    job: string | null
    zip: string | null
    city: string | null
    state: string | null
    country: string | null
    address1: string | null
    address2: string | null
    note: string | null
    degree: string | null
    extra_name: string | null
    phone_body: string | null
    phone_code: string | null
    middle_name: string | null
    company_name: string | null
    job_position: string | null
    linkedin_url: string | null
    mobile_phone: string | null
    job_department: string | null
    twitter_handle: string | null
    linkedin_handle: string | null
    phone_extension: string | null
    phone_country_code: string | null
}
