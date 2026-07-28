import { apiClient, getEndpoint, withRetry } from '../env'
import { mapToMobileLockerError } from '../errors'

export type { User } from '../types/user'
import type { User } from '../types/user'

/** @category Analytics */
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
            throw mapToMobileLockerError(err)
        }
    },
}
