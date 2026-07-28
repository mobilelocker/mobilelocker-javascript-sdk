import { apiClient, getEndpoint, withRetry } from '../env'
import { mapToMobileLockerError, invalidArgumentError } from '../errors'
import type { UserContact } from '../types/userContact'

/** @category CRM */
export const contacts = {
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
            throw mapToMobileLockerError(err)
        }
    },

    /**
     * Get a paginated chunk of contacts starting after a given ID.
     *
     * Prefer {@link contacts.eachPage} when you need to walk the whole book — it
     * keeps only one page in flight. Production users can have 100k+ contacts
     * (MLJS-24); do not reassemble every page into one array.
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
            throw mapToMobileLockerError(err)
        }
    },

    /**
     * Walk the address book page by page without loading everything into memory.
     *
     * Replaces the removed `getAll()` (MLJS-24). Process each chunk in `handler`
     * (render, index, filter). Do **not** push chunks into a growing array unless
     * the book is known to be small.
     *
     * @param pageSize - Page size passed to {@link contacts.getChunked} (must be ≥ 1).
     * @param handler - Called once per non-empty page; may be async.
     * @throws {@link MobileLockerError} when `pageSize` is not a positive integer, or on network/server error.
     *
     * @example
     * ```js
     * await mobilelocker.contacts.eachPage(500, (chunk) => {
     *   for (const contact of chunk) {
     *     // handle one contact — never accumulate the full book
     *   }
     * })
     * ```
     */
    async eachPage(
        pageSize: number,
        handler: (chunk: UserContact[]) => void | Promise<void>,
    ): Promise<void> {
        if (!Number.isInteger(pageSize) || pageSize < 1) {
            throw invalidArgumentError('pageSize must be a positive integer')
        }
        let minID = 0
        for (;;) {
            const chunk = await contacts.getChunked(minID, pageSize)
            if (chunk.length === 0) return
            await handler(chunk)
            minID = chunk[chunk.length - 1].id
            if (chunk.length < pageSize) return
        }
    },
}
