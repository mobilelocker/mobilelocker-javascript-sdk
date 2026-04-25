import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import axios from 'axios'

export type { User } from '../types/user'
import type { User } from '../types/user'

export const user = {
    /**
     * Get the currently authenticated user.
     *
     * @returns The authenticated {@link User}.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * const u = await mobilelocker.user.get()
     * console.log(`Hello, ${u.name}`)
     */
    async get(): Promise<User> {
        try {
            const { data } = await withRetry(() => apiClient.get<User>(getEndpoint('/user')))
            return data
        } catch (err) {
            if (err instanceof MobileLockerError) throw err
            if (axios.isAxiosError(err) && !err.response) {
                throw new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
            }
            throw new MobileLockerError(String(err), GeneralErrorCode.ServerError)
        }
    },
}
