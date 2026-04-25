import { apiClient, getEndpoint, isApp, withRetry } from '../env'

export type NetworkConnectionType = 'wifi' | 'cellular' | 'wired' | 'none'

export interface NetworkStatus {
    /** Whether the device currently has an active internet connection. */
    connected: boolean
    /** The type of network connection. */
    type: NetworkConnectionType
}

export const network = {
    /**
     * Get the current network connectivity status.
     *
     * In the iOS app, returns accurate connection type from the native layer.
     * In the browser, falls back to `navigator.onLine` — note that this may
     * return `true` on captive portals even without real internet access.
     *
     * @returns A {@link NetworkStatus} object with `connected` and `type`.
     *
     * @example
     * const { connected, type } = await mobilelocker.network.getStatus()
     * if (!connected) showOfflineBanner()
     */
    async getStatus(): Promise<NetworkStatus> {
        if (isApp()) {
            const { data } = await withRetry(() => apiClient.get<NetworkStatus>(getEndpoint('/network/status')))
            return data
        }
        // Browser fallback — navigator.onLine is approximate on captive portals
        const connected = navigator.onLine
        return { connected, type: connected ? 'wifi' : 'none' }
    },
}
