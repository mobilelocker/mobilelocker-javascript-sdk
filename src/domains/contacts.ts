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
    /**
     * Get all contacts for the current user.
     *
     * @returns Array of {@link UserContact} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getAll(): Promise<UserContact[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<UserContact[]>(getEndpoint('/user-contacts')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get a specific contact by ID.
     *
     * @param contactID - The ID of the contact to fetch.
     * @returns A {@link UserContact} object.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async get(contactID: number): Promise<UserContact> {
        try {
            const { data } = await withRetry(() => apiClient.get<UserContact>(getEndpoint(`/user-contacts/${contactID}`)))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get a paginated chunk of contacts starting after a given ID.
     *
     * Useful for incrementally syncing large contact lists without loading
     * everything into memory at once.
     *
     * @param minID - Return only contacts with an ID greater than this value.
     * @param limit - Maximum number of contacts to return.
     * @returns Array of {@link UserContact} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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
