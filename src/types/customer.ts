/**
 * A CRM customer record associated with the current presentation session.
 * Mirrors the iOS `GRDBCustomer` Swift model.
 */
export interface Customer {
    /** CRM object ID (e.g. a Salesforce 18-char ID). Also available as `object_id`. */
    id: string
    object_id: string
    /** CRM object type (e.g. `'Contact'`, `'Account'`). */
    object: string
    is_active: boolean
    is_person_account: boolean
    salutation: string
    name: string
    slug: string
    /** Display name of the related CRM object (e.g. an Account name). */
    related_object: string
    related_object_id: string
    /** Professional designation (e.g. `'MD'`, `'PhD'`). */
    designation: string
    specialty: string
    /** CRM record type name (e.g. `'Physician'`, `'Hospital'`). */
    record_type_name: string
    record_type_id: string
    is_favorite: boolean
    /** Whether this customer is currently associated with the active session. */
    is_current: boolean
    /** ISO 8601 timestamp of the most recent session this customer was selected in. */
    last_used_at: string | null
    updated_at: string | null
    is_fake: boolean
}
