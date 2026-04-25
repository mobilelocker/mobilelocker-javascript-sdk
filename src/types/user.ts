/**
 * The authenticated Mobile Locker user.
 * Mirrors the iOS `GRDBUser` Swift model's `toJSON()` output.
 */
export interface User {
    id: number
    first_name: string
    last_name: string
    name: string
    email: string
    sender_email: string | null
    phone: string | null
    country: string
    timezone: string
    current_team_id: number
    ask_for_review: boolean
    scanner_enabled: boolean
    calendar_url: string | null
    locale: string
    title: string
    region: string
    district: string
    territory: string
    salesforce_profile_id: string | null
    salesforce_profile_name: string | null
    default_greeting_type: string
    current_team_role: string
    is_employee: boolean
    is_super_admin: boolean
    is_debug_mode: boolean
    max_records_from_crm: number
    can_use_haystack: boolean
    /** Whether this is the currently authenticated user (vs. a team member record). */
    is_current_user: boolean
}
