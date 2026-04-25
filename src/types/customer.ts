/**
 * A CRM customer record associated with the current presentation session.
 * Mirrors the iOS `CustomerData` Swift DTO.
 */
export interface Customer {
    id: string
    name: string
    specialty: string
    /** Display name of the related CRM object (e.g. an Account name). */
    relatedObjectName: string
    /** ISO 8601 timestamp of the most recent session this customer was selected in. */
    lastUsedAt: string | null
    /** Whether this is a Salesforce Person Account (combined contact/account). */
    isPersonAccount: boolean
    /** CRM record type name (e.g. `'Physician'`, `'Hospital'`). */
    recordTypeName: string
    /** CRM object type (e.g. `'Contact'`, `'Account'`). */
    object: string
    /** CRM object ID (e.g. a Salesforce 18-char ID). */
    objectID: string
    /** Whether this customer is currently associated with the active session. */
    isCurrent: boolean
}
