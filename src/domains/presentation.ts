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
    async get(): Promise<Presentation> {
        try {
            const { data } = await withRetry(() => apiClient.get<Presentation>(getEndpoint('/presentation')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getEvents(): Promise<unknown[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown[]>(getEndpoint('/presentation/events')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getDeviceEvents(): Promise<unknown[]> {
        return presentation.getEvents()
    },

    reload(): void {
        void apiClient.post(getEndpoint('/presentation/reload'))
    },

    close(): void {
        analytics.logEvent('presentation', 'close', 'close-presentation', null, 'close-presentation')
    },

    async getAll(): Promise<Presentation[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Presentation[]>(getEndpoint('/presentations')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getByID(id: number): Promise<Presentation> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-id'), { params: { id } }),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    async getByName(name: string): Promise<Presentation> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Presentation>(getEndpoint('/presentations/by-name'), { params: { name } }),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    async refresh(): Promise<Presentation[]> {
        try {
            const { data } = await withRetry(() => apiClient.post<Presentation[]>(getEndpoint('/presentations/refresh')))
            return data
        } catch (err) { throw toError(err) }
    },

    async download(id: number): Promise<{ status: DownloadStatus }> {
        try {
            const { data } = await apiClient.post<{ status: DownloadStatus }>(getEndpoint('/presentation/download'), { id })
            return data
        } catch (err) { throw toError(err) }
    },

    openByID(id: number): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByID() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { id } })
    },

    openByExternalID(externalID: string): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByExternalID() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { external_id: externalID } })
    },

    openByName(name: string): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openByName() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation'), { params: { name } })
    },

    openPicker(): void {
        if (!isMobileLockerIOSApp()) throw new MobileLockerError('openPicker() is only supported in the iOS app', GeneralErrorCode.ServerError)
        void apiClient.get(getEndpoint('/open-presentation-picker'))
    },
}
