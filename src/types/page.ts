/**
 * Cursor-paginated list page from the Mobile Locker JS bridge (iOS 5.5.0+).
 *
 * Host: `GET …?limit={1…5000}&cursor={token?}` → `{ data, meta: { cursor: { next, count } } }`
 * (MLI-1718 / MLJS-26 / MLJS-27).
 */
export interface PageCursor {
    /** Opaque token for the next request’s `cursor` param, or `null` when no further rows. */
    next: string | null
    /** Number of rows in `data` (`data.length`). */
    count: number
}

export interface PageMeta {
    cursor: PageCursor
}

export interface Page<T> {
    data: T[]
    meta: PageMeta
}
