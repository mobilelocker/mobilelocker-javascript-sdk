export interface Presentation {
    id: number
    name: string
    code: string
    detailedDescription: string | null
    type: string | null
    status: string | null
    thumbnailURL: string | null
    isBookmarked: boolean
    isNew: boolean
    isFeatured: boolean
    isExpired: boolean
    isURL: boolean
    isInstalled: boolean
    isAvailable: boolean
    isDownloading: boolean
    isPaused: boolean
    isUpdating: boolean
    hasUpdateAvailable: boolean
    canBeDownloaded: boolean
    canBeSharedViaEmail: boolean
    canBeSharedViaLink: boolean
    canBeSharedViaText: boolean
    canBeAnnotated: boolean
    canBeExported: boolean
    isInternalUseOnly: boolean
    mainPath: string | null
    pdfViewMode: string | null
    pdfPageViewMode: string | null
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
    isCerosExperience: boolean
    isIspring: boolean
    showExitInstructions: boolean
    isOffice: boolean
    portraitOnly: boolean
    landscapeOnly: boolean
    createdAtFormatted: string
    updatedAtFormatted: string
    contentUpdatedAtFormatted: string
    expiresAtFormatted: string | null
    brandID: number
    labelsText: string
}
