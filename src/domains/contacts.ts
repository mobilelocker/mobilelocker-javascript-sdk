import { apiClient, getEndpoint, withRetry } from '../env'
import { mapToMobileLockerError } from '../errors'
import type { UserContact } from '../types/userContact'
import type { Page } from '../types/page'
import { pagedListAPI } from '../utils/page'

const list = pagedListAPI<UserContact>('/user-contacts', mapToMobileLockerError)

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
     * Get one page of contacts (cursor envelope).
     *
     * Requires Mobile Locker iOS 5.5.0+. Prefer {@link contacts.eachPage} when
     * walking the whole book. Production users can have 100k+ contacts (MLJS-24 /
     * MLJS-27); do not reassemble every page into one array.
     *
     * Host: `GET /mobilelocker/api/user-contacts?limit=&cursor=`
     * → `{ data, meta: { cursor: { next, count } } }` ([MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)).
     *
     * @param limit - Page size (**1…5000**).
     * @param cursor - From previous `meta.cursor.next`. Omit for the first page.
     * @returns {@link Page} of {@link UserContact} records.
     * @throws {@link MobileLockerError} with code `InvalidArgument` when `limit` is out of range.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * ```js
     * const page = await mobilelocker.contacts.getPage(500)
     * const next = page.meta.cursor.next
     *   ? await mobilelocker.contacts.getPage(500, page.meta.cursor.next)
     *   : null
     * ```
     */
    getPage(limit: number, cursor?: string): Promise<Page<UserContact>> {
        return list.getPage(limit, cursor)
    },

    /**
     * Walk the address book page by page without loading everything into memory.
     *
     * Replaces the removed `getAll()` (MLJS-24) and intermediate `getChunked(min, limit)`
     * (MLJS-27). Advances only via `meta.cursor.next`; stops when `next === null`.
     * Process each chunk in `handler`. Do **not** push chunks into a growing array
     * unless the book is known to be small. Requires iOS 5.5.0+.
     *
     * @param pageSize - Page size passed to {@link contacts.getPage} (**1…5000**).
     * @param handler - Called once per non-empty page; may be async.
     * @throws {@link MobileLockerError} when `pageSize` is out of range, or on network/server error.
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
    eachPage(
        pageSize: number,
        handler: (chunk: UserContact[]) => void | Promise<void>,
    ): Promise<void> {
        return list.eachPage(pageSize, handler)
    },
}
