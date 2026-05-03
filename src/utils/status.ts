export type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
    ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
    : S

/**
 * Intersects a type that has a `status` string field with boolean helpers
 * of the form `is{Status}` for every status value in the union.
 *
 * Snake_case status values are converted to camelCase:
 * `'not_connected'` → `isNotConnected`
 *
 * @example
 * type MyResult = WithStatusBooleans<
 *   | { status: 'success'; data: string }
 *   | { status: 'not_found' }
 * >
 * // Result has: isSuccess, isNotFound
 */
export type WithStatusBooleans<T extends { status: string }> = T & {
    readonly [K in T['status'] as `is${Capitalize<SnakeToCamel<K>>}`]: boolean
}

function toCamelKey(status: string): string {
    const camel = status.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
    return `is${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
}

/**
 * Wraps a status result object with `is{Status}` boolean helpers.
 *
 * All known status values must be passed so that each boolean is explicitly
 * set to `true` or `false` (not just the current one).
 *
 * @example
 * const STATUSES = ['success', 'cancelled', 'failed'] as const
 * return withStatusBooleans(data, STATUSES)
 * // result.isSuccess, result.isCancelled, result.isFailed
 */
export function withStatusBooleans<T extends { status: S }, S extends string>(
    data: T,
    allStatuses: readonly S[],
): WithStatusBooleans<T> {
    const booleans: Record<string, boolean> = {}
    for (const status of allStatuses) {
        booleans[toCamelKey(status)] = data.status === status
    }
    return { ...data, ...booleans } as unknown as WithStatusBooleans<T>
}
