import { apiClient, getEndpoint, withRetry } from '../env'
import { invalidArgumentError } from '../errors'
import type { Page } from '../types/page'

/** Host list page limit range (MLI-1718 / bridgeListPageLimitRange). */
export const PAGE_LIMIT_MIN = 1
export const PAGE_LIMIT_MAX = 5000

/**
 * Validate a page `limit` / `pageSize` against the host range (1…5000).
 * @throws {@link MobileLockerError} with code `InvalidArgument` when out of range.
 */
export function assertPageLimit(value: number, name: string): void {
    if (!Number.isInteger(value) || value < PAGE_LIMIT_MIN || value > PAGE_LIMIT_MAX) {
        throw invalidArgumentError(
            `${name} must be an integer between ${PAGE_LIMIT_MIN} and ${PAGE_LIMIT_MAX}`,
        )
    }
}

/**
 * GET a cursor-enveloped list page from the JS bridge.
 *
 * Host: `GET path?limit={1…5000}&cursor={token?}`
 * → `{ data, meta: { cursor: { next, count } } }` (MLI-1718).
 *
 * `limit` is validated before the request. Network failures are remapped via `mapError`.
 * InvalidArgument from validation is never remapped.
 */
export async function getCursorPage<T>(
    path: string,
    limit: number,
    cursor: string | undefined,
    mapError: (err: unknown) => Error,
): Promise<Page<T>> {
    assertPageLimit(limit, 'limit')
    try {
        const params = cursor ? { limit, cursor } : { limit }
        const { data } = await withRetry(() =>
            apiClient.get<Page<T>>(getEndpoint(path), { params }),
        )
        return data
    } catch (err) {
        throw mapError(err)
    }
}

/**
 * Walk a cursor-paginated list. Advances only via `meta.cursor.next`.
 * Stops when `next === null` or the page is empty (host empty ⇒ next null).
 * Does not reassemble pages into one array.
 */
export async function eachCursorPage<T>(
    fetchPage: (limit: number, cursor?: string) => Promise<Page<T>>,
    pageSize: number,
    handler: (chunk: T[]) => void | Promise<void>,
): Promise<void> {
    assertPageLimit(pageSize, 'pageSize')
    let cursor: string | undefined
    for (;;) {
        const page = await fetchPage(pageSize, cursor)
        if (page.data.length > 0) {
            await handler(page.data)
        }
        // End of stream: explicit null, or empty page (defensive if host omits next).
        if (page.meta.cursor.next === null || page.data.length === 0) return
        cursor = page.meta.cursor.next
    }
}

/**
 * Bind getPage / eachPage for one bridge list path (same envelope, different error map).
 */
export function pagedListAPI<T>(
    path: string,
    mapError: (err: unknown) => Error,
): {
    getPage: (limit: number, cursor?: string) => Promise<Page<T>>
    eachPage: (
        pageSize: number,
        handler: (chunk: T[]) => void | Promise<void>,
    ) => Promise<void>
} {
    const getPage = (limit: number, cursor?: string): Promise<Page<T>> =>
        getCursorPage(path, limit, cursor, mapError)
    const eachPage = (
        pageSize: number,
        handler: (chunk: T[]) => void | Promise<void>,
    ): Promise<void> => eachCursorPage(getPage, pageSize, handler)
    return { getPage, eachPage }
}
