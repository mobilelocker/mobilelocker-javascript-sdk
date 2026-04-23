export interface BusinessCard {
    id: string
    httpStatus: number
    teamID: number
    userID: number
    eventID: number
    attendeeID: string
    url: string
    crmID: string
    crmObjectType: string
    source: string
    verified: boolean
    createdAt: string
    updatedAt: string
    firstName: string | null
    lastName: string | null
    email: string | null
    name: string | null
    company: string | null
    phone: string | null
    jobTitle: string | null
}
