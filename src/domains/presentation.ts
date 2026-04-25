import { apiClient, getEndpoint, isMobileLockerIOSApp, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { Presentation } from '../types/presentation'
import { analytics } from './analytics'
import axios from 'axios'

export type DownloadStatus = 'queued' | 'already_installed' | 'not_available' | 'not_permitted'

function toError(err: unknown): MobileLockerError {
    if (err instanceof MobileLockerError) return err
    if (axios.isAxiosError(err) && !err.response) {
        return new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
    }
    return new MobileLockerError(
        axios.isAxiosError(err) ? ((err.response?.data as { message?: string })?.message ?? err.message) : String(err),
        GeneralErrorCode.ServerError,
    )
}

export const presentation = {
    /**
     * Get the presentation that is currently open.
     *
     * @returns The current {@link Presentation}.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async get(): Promise<Presentation> {
        try {
            const { data } = await withRetry(() => apiClient.get<Presentation>(getEndpoint('/presentation')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get the analytics events recorded for the current presentation session.
     *
     * @returns Array of raw event objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getEvents(): Promise<unknown[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown[]>(getEndpoint('/presentation/events')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Alias for {@link getEvents}.
     *
     * @returns Array of raw event objects.
     */
    async getDeviceEvents(): Promise<unknown[]> {
        return presentation.getEvents()
    },

    /**
     * Reload the current presentation's web content.
     *
     * Triggers a full page reload inside the presentation webview.
     */
    reload(): void {
        void apiClient.post(getEndpoint('/presentation/reload'))
    },

    /**
     * Close the current presentation and return to the app home screen.
     */
    close(): void {
        analytics.logEvent('presentation', 'close', 'close-presentation', null, 'close-presentation')
    },

    /**
     * Get all presentations available to the current user.
     *
     * @returns Array of {@link Presentation} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getAll(): Promise<Presentation[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Presentation[]>(getEndpoint('/presentations')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a presentation by its numeric ID.
     *
     * @param id - The presentation ID.
     * @returns The matching {@link Presentation}.
     * @throws {@link MobileLockerError} on network failure, or if not found.
     */
    async getByID(id: number): Promise<Presentation> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-id'), { params: { id } }),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a presentation by its name.
     *
     * @param name - The presentation name (case-sensitive).
     * @returns The matching {@link Presentation}.
     * @throws {@link MobileLockerError} on network failure, or if not found.
     */
    async getByName(name: string): Promise<Presentation> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-name'), { params: { name } }),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Refresh the list of available presentations from the server.
     *
     * @returns Updated array of {@link Presentation} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async refresh(): Promise<Presentation[]> {
        try {
            const { data } = await withRetry(() => apiClient.post<Presentation[]>(getEndpoint('/presentations/refresh')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Queue a presentation for download to the device.
     *
     * @param id - The numeric ID of the presentation to download.
     * @returns An object with `status`: `'queued'`, `'already_installed'`, `'not_available'`, or `'not_permitted'`.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async download(id: number): Promise<{ status: DownloadStatus }> {
        try {
            const { data } = await apiClient.post<{ status: DownloadStatus }>(getEndpoint('/presentation/download'), { id })
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Open a presentation by its numeric ID.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @param id - The numeric ID of the presentation to open.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    openByID(id: number): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByID() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { id } })
    },

    /**
     * Open a presentation by its external CRM ID.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @param externalID - The external identifier for the presentation (e.g. a Salesforce ID).
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    openByExternalID(externalID: string): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByExternalID() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { external_id: externalID } })
    },

    /**
     * Open a presentation by its name.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @param name - The presentation name (case-sensitive).
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    openByName(name: string): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByName() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { name } })
    },

    /**
     * Open the native presentation picker so the user can choose a presentation to open.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    openPicker(): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openPicker() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation-picker'))
    },
}
