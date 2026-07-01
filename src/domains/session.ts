import { apiClient, getEndpoint, isMobileLocker, withRetry, hitSessionId } from '../env'
import { getLocalforageEvents } from './analytics'

/** @category Analytics */
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

    /**
     * The session id created from the JWT's `hit_uuid` when the presentation was opened
     * via a shared link on the CDN, or `null` if not applicable or not yet created.
     */
    get hitSessionId(): string | null {
        return hitSessionId
    },
}
