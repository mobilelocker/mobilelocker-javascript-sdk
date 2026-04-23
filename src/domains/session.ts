import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { getLocalforageEvents } from './analytics'

export const session = {
    async getDeviceEvents(): Promise<unknown[]> {
        if (isMobileLocker()) {
            const { data } = await withRetry(() => apiClient.get<unknown[]>(getEndpoint('/session/events')))
            return data
        }
        return getLocalforageEvents()
    },
}
