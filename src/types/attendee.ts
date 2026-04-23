export interface Attendee {
    id: string
    httpStatus: number
    teamID: number
    eventID: number
    userID: number
    formResponseID: number | null
    cardID: string | null
    type: string
    status: string
    source: string
    crmObjectType: string
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
    badgeID: string | null
    checkedInByID: number | null
    checkedInAt: string | null
    checkedOutAt: string | null
    declinedAt: string | null
    createdAt: string
    updatedAt: string
    salutation: string
    designation: string
    specialty: string
    industry: string
    crmObject: string
    userContactID: number | null
}
