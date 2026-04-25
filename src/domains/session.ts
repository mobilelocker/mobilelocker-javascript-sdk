import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { getLocalforageEvents } from './analytics'

export const session = {
    /**
     * Get all analytics events recorded during the current device session.
     *
     * In the iOS app, fetches events from the server scoped to the current session.
     * Outside the app (local development), returns events buffered in IndexedDB via localforage.
     *
     * @returns Array of raw event objects.
     */
    async getDeviceEvents(): Promise<unknown[]> {
        if (isMobileLocker()) {
            const { data } = await withRetry(() => apiClient.get<unknown[]>(getEndpoint('/session/events')))
            return data
        }
        return getLocalforageEvents()
    },
}
