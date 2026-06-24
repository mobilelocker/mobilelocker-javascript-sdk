import {apiClient, getEndpoint, isIOS, withRetry} from '../env'
import {MobileLockerError, GeneralErrorCode} from '../errors'
import type {Presentation} from '../types/presentation'
import {analytics} from './analytics'
import {withStatusBooleans, WithStatusBooleans} from '../utils/status'
import axios from 'axios'

export type DownloadStatus = 'queued' | 'already_installed' | 'not_available' | 'not_permitted'

const DOWNLOAD_STATUSES = ['queued', 'already_installed', 'not_available', 'not_permitted'] as const

export type DownloadResult = WithStatusBooleans<{ status: DownloadStatus }>

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

/** @category Data */
export const presentation = {
    /**
     * Get the presentation that is currently open.
     *
     * @returns The current {@link Presentation}.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async get(): Promise<Presentation> {
        try {
            const {data} = await withRetry(() => apiClient.get<Presentation>(getEndpoint('/presentation')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get the analytics events recorded for the current presentation session.
     *
     * @returns Array of raw event objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getEvents(): Promise<unknown[]> {
        try {
            const {data} = await withRetry(() => apiClient.get<unknown[]>(getEndpoint('/presentation/events')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Alias for `getEvents`.
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
            const {data} = await withRetry(() => apiClient.get<Presentation[]>(getEndpoint('/presentations')))
            return data
        } catch (err) {
            throw toError(err)
        }
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
            const {data} = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-id'), {params: {id}}),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
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
            const {data} = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-name'), {params: {name}}),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Refresh the list of available presentations from the server.
     *
     * @returns Updated array of {@link Presentation} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async refresh(): Promise<Presentation[]> {
        try {
            const {data} = await withRetry(() => apiClient.post<Presentation[]>(getEndpoint('/presentations/refresh')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Queue a presentation for download to the device.
     *
     * @param id - The numeric ID of the presentation to download.
     * @returns An object with `status`: `'queued'`, `'already_installed'`, `'not_available'`, or `'not_permitted'`.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async download(id: number): Promise<DownloadResult> {
        try {
            const {data} = await apiClient.post<{ status: DownloadStatus }>(getEndpoint('/presentation/download'), {id})
            return withStatusBooleans(data, DOWNLOAD_STATUSES)
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Open a presentation by its numeric ID.
     *
     * In the iOS app, triggers native presentation navigation via the app bridge.
     * In a browser, opens the presentation in a new tab using the platform web URL.
     *
     * @param id - The numeric ID of the presentation to open.
     *
     * @example
     * mobilelocker.presentation.openByID(42)
     */
    openByID(id: number): void {
        if (isIOS()) {
            void apiClient.get(getEndpoint('/open-presentation'), {params: {id}})
        } else {
            window.open(`https://app.mobilelocker.com/v2/app/content/${id}/open`, '_blank')
        }
    },

    /**
     * Open a presentation by its external CRM ID.
     *
     * In the iOS app, triggers native presentation navigation via the app bridge.
     * In a browser, fetches all presentations, finds the match by external ID, then opens it.
     *
     * @param externalID - The external identifier for the presentation (e.g. a Salesforce ID).
     * @throws {@link MobileLockerError} if no presentation with the given external ID is found.
     *
     * @example
     * await mobilelocker.presentation.openByExternalID('a0B1234567890')
     */
    async openByExternalID(externalID: string): Promise<void> {
        if (isIOS()) {
            void apiClient.get(getEndpoint('/open-presentation'), {params: {external_id: externalID}})
        } else {
            const all = await this.getAll()
            const match = all.find(p => p.external_id === externalID)
            if (!match) throw new MobileLockerError(`No presentation found with external ID: ${externalID}`, GeneralErrorCode.ServerError)
            this.openByID(match.id)
        }
    },

    /**
     * Open a presentation by its name.
     *
     * In the iOS app, triggers native presentation navigation via the app bridge.
     * In a browser, fetches all presentations, finds the match by name, then opens it.
     *
     * @param name - The presentation name (case-sensitive).
     * @throws {@link MobileLockerError} if no presentation with the given name is found.
     *
     * @example
     * await mobilelocker.presentation.openByName('Kazaamax Rebate Calculator Demo');
     */
    async openByName(name: string): Promise<void> {
        if (isIOS()) {
            void apiClient.get(getEndpoint('/open-presentation'), {params: {name: name}})
        } else {
            const all = await this.getAll()
            const match = all.find(p => p.name === name)
            if (!match) throw new MobileLockerError(`No presentation found with name: ${name}`, GeneralErrorCode.ServerError)
            this.openByID(match.id)
        }
    },

    /**
     * Open the native presentation picker so the user can choose a presentation to open.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     */
    openPicker(): void {
        if (!isIOS()) throw new MobileLockerError('openPicker() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation-picker'))
    },
}
