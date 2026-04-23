export interface Customer {
    id: string
    name: string
    specialty: string
    relatedObjectName: string
    lastUsedAt: string | null
    isPersonAccount: boolean
    recordTypeName: string
    object: string
    objectID: string
    isCurrent: boolean
}
