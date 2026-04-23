export interface Folder {
    id: number
    name: string
    detailedDescription: string | null
    imageURI: string | null
    userID: number
    parentID: number
    isSpecial: boolean
    isHomeFolder: boolean
    isWorldFolder: boolean
    isFavoritesFolder: boolean
    isMyFolder: boolean
    isSlidesFolder: boolean
    isNewFolder: boolean
    presentationIDs: number[]
}
