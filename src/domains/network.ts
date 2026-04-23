import { apiClient, getEndpoint, isMobileLockerApp, withRetry } from '../env'

export type NetworkConnectionType = 'wifi' | 'cellular' | 'wired' | 'none'

export interface NetworkStatus {
    connected: boolean
    type: NetworkConnectionType
}

export const network = {
    async getStatus(): Promise<NetworkStatus> {
        if (isMobileLockerApp()) {
            const { data } = await withRetry(() => apiClient.get<NetworkStatus>(getEndpoint('/network/status')))
            return data
        }
        // Browser fallback — navigator.onLine is approximate on captive portals
        const connected = navigator.onLine
        return { connected, type: connected ? 'wifi' : 'none' }
    },
}
