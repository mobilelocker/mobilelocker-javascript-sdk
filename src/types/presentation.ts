/**
 * A presentation in the user's Mobile Locker library.
 * Mirrors the iOS `PresentationData` Swift DTO.
 */
export interface Presentation {
    id: number
    name: string
    /** Short unique code used in share links. */
    code: string
    detailedDescription: string | null
    /** Presentation format type (e.g. `'html'`, `'pdf'`). */
    type: string | null
    status: string | null
    /** URL to the presentation thumbnail image. */
    thumbnailURL: string | null

    // ── Library state ────────────────────────────────────────────────────────
    isBookmarked: boolean
    isNew: boolean
    isFeatured: boolean
    /** Whether the presentation has passed its expiry date. */
    isExpired: boolean
    /** Whether the presentation opens an external URL instead of local content. */
    isURL: boolean

    // ── Download state ───────────────────────────────────────────────────────
    isInstalled: boolean
    isAvailable: boolean
    isDownloading: boolean
    isPaused: boolean
    isUpdating: boolean
    hasUpdateAvailable: boolean
    canBeDownloaded: boolean

    // ── Sharing permissions ──────────────────────────────────────────────────
    canBeSharedViaEmail: boolean
    canBeSharedViaLink: boolean
    canBeSharedViaText: boolean

    // ── Viewer capabilities ──────────────────────────────────────────────────
    canBeAnnotated: boolean
    canBeExported: boolean
    isInternalUseOnly: boolean

    // ── Content paths and viewer config ─────────────────────────────────────
    /** Relative path to the main entry file (e.g. `'index.html'`). */
    mainPath: string | null
    pdfViewMode: string | null
    pdfPageViewMode: string | null

    // ── Toolbar and UI options ───────────────────────────────────────────────
    showSearchButton: boolean
    showSettingsButton: boolean
    showNavigationListsButton: boolean
    showThumbnailBrowserButton: boolean
    isDocumentSliderEnabled: boolean
    isNavigationHistoryEnabled: boolean
    automaticallyHideToolbars: boolean
    isPDFForm: boolean
    alwaysShowToolbar: boolean

    shareTemplateID: number

    // ── Format flags ─────────────────────────────────────────────────────────
    isCerosExperience: boolean
    isIspring: boolean
    showExitInstructions: boolean
    isOffice: boolean

    // ── Orientation ──────────────────────────────────────────────────────────
    portraitOnly: boolean
    landscapeOnly: boolean

    // ── Formatted dates (pre-formatted strings from the server) ──────────────
    createdAtFormatted: string
    updatedAtFormatted: string
    contentUpdatedAtFormatted: string
    expiresAtFormatted: string | null

    brandID: number
    /** Comma-separated label names applied to this presentation. */
    labelsText: string
}
