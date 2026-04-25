/**
 * A presentation folder in the user's library.
 * Mirrors the iOS `GRDBFolder` Swift model's `toJSON()` output.
 */
export interface Folder {
    id: number
    name: string
    detailed_description: string | null
    /** URI to the folder's thumbnail image, if set. */
    image_uri: string | null
    user_id: number
    /** ID of the parent folder, or `0` for root-level folders. */
    parent_id: number
    /** Nested set left boundary (used for tree traversal). */
    _lft: number
    /** Nested set right boundary (used for tree traversal). */
    _rgt: number
    /** IDs of presentations contained in this folder. */
    presentation_ids: number[]
}
