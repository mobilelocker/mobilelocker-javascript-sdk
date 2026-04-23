import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { UserContact } from '../types/userContact'
import axios from 'axios'

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

export const contacts = {
    async getAll(): Promise<UserContact[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<UserContact[]>(getEndpoint('/user-contacts')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    async getChunked(minID: number, limit: number): Promise<UserContact[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<UserContact[]>(getEndpoint('/user-contacts'), { params: { min: minID, limit } }),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
    },
}
