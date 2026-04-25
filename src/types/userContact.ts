/**
 * A contact from the current user's personal contact list.
 * Mirrors the iOS `UserContactDisplayData` Swift DTO.
 */
export interface UserContact {
    id: number
    name: string
    /** URL-safe identifier. */
    slug: string
    email: string | null
    title: string | null
    companyName: string | null
    /** City or locality. */
    locality: string | null
    /** State, province, or region. */
    administrativeArea: string | null
    /** Professional designation (e.g. `'MD'`, `'PhD'`). */
    designation: string | null
    specialty: string | null
    leadSource: string | null
    /** National Provider Identifier (US healthcare). */
    npi: string | null
    level: string | null
    tier: string | null
    segment: string | null
    /** Connected CRM provider name (e.g. `'salesforce'`). */
    crmProvider: string | null
    /** CRM object type (e.g. `'Contact'`, `'Lead'`). */
    crmObject: string | null
    crmObjectID: string | null
    /** Whether this contact exists in the connected CRM. */
    inCRM: boolean
    /** ISO 8601 timestamp of the most recent contact interaction. */
    lastContactedAt: string | null
    updatedAt: string | null
    createdAt: string | null
}
