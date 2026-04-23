export interface UserContact {
    id: number
    name: string
    slug: string
    email: string | null
    title: string | null
    companyName: string | null
    locality: string | null
    administrativeArea: string | null
    designation: string | null
    specialty: string | null
    leadSource: string | null
    npi: string | null
    level: string | null
    tier: string | null
    segment: string | null
    crmProvider: string | null
    crmObject: string | null
    crmObjectID: string | null
    inCRM: boolean
    lastContactedAt: string | null
    updatedAt: string | null
    createdAt: string | null
}
