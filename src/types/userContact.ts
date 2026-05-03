import { WithStatusBooleans } from '../utils/status'

/**
 * NeverBounce email deliverability result for a contact's email address.
 * @see https://developers.neverbounce.com/reference/single-check#result-codes
 */
export type EmailDeliverabilityStatus =
    /** Not yet checked. */
    | 'TBD'
    /** Verified as a real, active address currently accepting mail. Safe to send. */
    | 'valid'
    /** Manually overridden — treated as deliverable regardless of NeverBounce result. */
    | 'overridden'
    /** Verified as a bad recipient address; will result in a bounce. Do not send. */
    | 'invalid'
    /** Temporary/disposable address. Will result in a bounce. Do not send. */
    | 'disposable'
    /** Domain accepts all mail ("catch-all"). Deliverability cannot be confirmed — send only if your bounce tolerance allows it. */
    | 'catchall'
    /** Domain or server did not respond after 75 attempts. Status is inconclusive — send only if your bounce tolerance allows it. */
    | 'unknown'

/**
 * A deliverability status result with `is*` boolean helpers for each status value.
 *
 * @example
 * const result: UserContactDeliverability = withStatusBooleans({ status: 'valid' }, EMAIL_DELIVERABILITY_STATUSES)
 * result.isValid      // true
 * result.isDisposable // false
 */
export type UserContactDeliverability = WithStatusBooleans<{ status: EmailDeliverabilityStatus }>

export const EMAIL_DELIVERABILITY_STATUSES = [
    'TBD', 'valid', 'overridden', 'invalid', 'disposable', 'catchall', 'unknown',
] as const

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
    email_deliverability_status: EmailDeliverabilityStatus | null
    can_be_deleted: boolean
    last_contacted_at: string | null
    synced_at: string | null
    created_at: string | null
    updated_at: string | null
}
