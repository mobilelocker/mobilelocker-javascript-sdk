/**
 * A presentation folder in the user's library.
 * Mirrors the iOS `FolderData` Swift DTO.
 */
export interface Folder {
    id: number
    name: string
    detailedDescription: string | null
    /** URI to the folder's thumbnail image, if set. */
    imageURI: string | null
    userID: number
    /** ID of the parent folder, or `0` for root-level folders. */
    parentID: number
    /** Whether this is a system-managed special folder. */
    isSpecial: boolean
    isHomeFolder: boolean
    isWorldFolder: boolean
    isFavoritesFolder: boolean
    isMyFolder: boolean
    isSlidesFolder: boolean
    isNewFolder: boolean
    /** IDs of presentations contained in this folder. */
    presentationIDs: number[]
}
