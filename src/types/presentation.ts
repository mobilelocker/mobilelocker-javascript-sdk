/**
 * A presentation in the user's Mobile Locker library.
 * Mirrors the iOS `GRDBPresentation` Swift model's `toJSON(files:)` output.
 *
 * Viewer capabilities (e.g. `showSearchButton`, `canBeAnnotated`) and download
 * state flags are not serialized by the server — derive them from `settings`
 * (a JSON string) and `status` at runtime.
 */
export interface Presentation {
    id: number
    name: string
    slug: string
    /** Short unique code used in share links. */
    code: string | null
    /** External URL, set when the presentation opens a remote URL. */
    url: string | null
    team_id: number | null
    description: string
    /** Presentation format type (e.g. `'html'`, `'pdf'`, `'video'`). */
    type: string
    /** Relative path to the main entry file (e.g. `'index.html'`). */
    main_path: string
    /** Download/availability status (e.g. `'Installed'`, `'Available'`). */
    status: string
    installed: boolean
    thumbnail_url: string | null
    thumbnail_hash: string | null
    files_hash: string | null
    show_in_main_list: boolean
    is_rateable: boolean
    is_bookmarked: boolean
    is_featured: boolean
    is_internal_use_only: boolean
    can_be_printed_by_user: boolean
    can_be_exported: boolean
    can_be_shared_via_email: boolean
    can_be_shared_via_link: boolean
    can_be_shared_via_text: boolean
    /** Legacy alias for `can_be_shared_via_email`. */
    can_be_shared: boolean
    /** Legacy alias for `can_be_shared_via_link` (intentional typo kept for compatibility). */
    cah_be_shared_link: boolean
    brand_id: number
    /** ISO 8601 timestamp until which the presentation is flagged as new. */
    new_until_at: string | null
    /** ISO 8601 expiry timestamp, or `null` if the presentation does not expire. */
    expires_at: string | null
    share_template_id: number
    locale: string
    is_pdf_form: boolean
    is_ceros_experience: boolean
    is_ispring: boolean
    can_be_used_in_haystack: boolean
    has_transcript: boolean
    comment_count: number
    subscriber_count: number
    /** Raw JSON settings string — parse to read viewer capability flags. */
    settings: string
    is_slide_deck: boolean
    owner_id: number
    created_at: string
    updated_at: string
    content_updated_at: string
    files: PresentationFile[]
}

/**
 * A file asset belonging to a presentation.
 * Mirrors the iOS `GRDBPresentationFile` Swift model's `toJSON()` output.
 */
export interface PresentationFile {
    id: number
    presentation_id: number
    presentation_code: string
    /** Relative path of the file within the presentation bundle. */
    path: string
    /** Remote URL for the file asset. */
    url: string | null
    /** File size in bytes. */
    size: number
    local_hash: string | null
    remote_hash: string | null
    created_at: string | null
    updated_at: string | null
}
