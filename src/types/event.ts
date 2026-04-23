export interface Event {
    id: number
    teamID: number
    ownerID: number
    formID: number
    provider: string
    eventType: string
    status: string
    crmObjectType: string | null
    crmObjectID: string | null
    externalID: string | null
    crmCampaignID: string | null
    name: string
    slug: string
    website: string
    location: string
    startAt: string
    endAt: string
    timezone: string
    createdAt: string
    updatedAt: string
}
