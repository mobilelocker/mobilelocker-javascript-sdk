/**
 * An event attendee captured via badge scan or lead retrieval.
 * Mirrors the iOS `AttendeeData` Swift DTO.
 */
export interface Attendee {
    id: string
    httpStatus: number
    teamID: number
    eventID: number
    userID: number
    /** ID of the form response submitted for this attendee, if any. */
    formResponseID: number | null
    /** ID of an associated business card scan, if any. */
    cardID: string | null
    type: string
    status: string
    /** How the attendee record was captured (e.g. `'badge'`, `'manual'`). */
    source: string
    /** CRM object type mapped to this attendee (e.g. `'Contact'`, `'Lead'`). */
    crmObjectType: string
    /** CRM object ID for this attendee. */
    crmObjectID: string
    firstName: string
    lastName: string
    name: string
    slug: string
    degree: string
    email: string
    title: string
    company: string
    phone: string
    mobilePhone: string
    address: string
    street1: string
    street2: string
    city: string
    state: string
    postalCode: string
    country: string
    note: string
    linkedinURL: string
    /** Badge barcode or QR value, if scanned. */
    badgeID: string | null
    checkedInByID: number | null
    /** ISO 8601 timestamp when the attendee checked in, if applicable. */
    checkedInAt: string | null
    /** ISO 8601 timestamp when the attendee checked out, if applicable. */
    checkedOutAt: string | null
    /** ISO 8601 timestamp when the attendee declined, if applicable. */
    declinedAt: string | null
    createdAt: string
    updatedAt: string
    salutation: string
    designation: string
    specialty: string
    industry: string
    crmObject: string
    /** ID of the linked user contact record, if any. */
    userContactID: number | null
}
