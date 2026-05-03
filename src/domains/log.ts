import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { analytics } from './analytics'
import localforage from 'localforage'

export type SDKLogLevel = 'debug' | 'info' | 'warn' | 'error'
export type SDKLogDomain = 'analytics' | 'congresses' | 'contacts' | 'crm'
    | 'data' | 'database' | 'device' | 'log'
    | 'presentation' | 'scanner' | 'search' | 'session'
    | 'share' | 'storage' | 'ui' | 'user'
    | 'custom'

export interface SDKLogEntry {
    id: number
    /** ISO 8601 timestamp of when the entry was written. */
    timestamp: string
    level: SDKLogLevel
    domain: SDKLogDomain
    /** Full function name that wrote the entry, or `null` for custom entries. */
    function: string | null
    message: string
    /** How long the operation took in milliseconds, or `null` for custom entries. */
    durationMs: number | null
    /** Number of retries before success, or `null` for custom entries. */
    retryCount: number | null
    /** Arbitrary key/value metadata attached to the entry. */
    metadata: Record<string, unknown> | null
}

export interface SDKLogFilter {
    /** Filter by log level. */
    level?: SDKLogLevel
    /** Filter by SDK domain. */
    domain?: SDKLogDomain
    /** Filter by function name. */
    function?: string
    /** Return only entries at or after this ISO 8601 timestamp. */
    since?: string
    /** Return only entries at or before this ISO 8601 timestamp. */
    until?: string
    /** Return only entries where `retryCount > 0`. */
    retriesOnly?: boolean
    /** Maximum number of entries to return. Defaults to `100`. */
    limit?: number
}

const MAX_LOCAL_LOGS = 1000
const LOCAL_STORAGE_KEY = 'ml_sdk_logs'

let _debugMode = false
let _localLogId = 0

async function _localLogs(): Promise<SDKLogEntry[]> {
    return (await localforage.getItem<SDKLogEntry[]>(LOCAL_STORAGE_KEY)) ?? []
}

async function _saveLocalLog(entry: SDKLogEntry): Promise<void> {
    const logs = await _localLogs()
    logs.push(entry)
    if (logs.length > MAX_LOCAL_LOGS) logs.splice(0, logs.length - MAX_LOCAL_LOGS)
    await localforage.setItem(LOCAL_STORAGE_KEY, logs)
}

function _writeLog(level: SDKLogLevel, message: string, metadata?: Record<string, unknown>): void {
    const entry: SDKLogEntry = {
        id: ++_localLogId,
        timestamp: new Date().toISOString(),
        level,
        domain: 'custom',
        function: null,
        message,
        durationMs: null,
        retryCount: null,
        metadata: metadata ?? null,
    }
    if (isMobileLocker()) {
        void apiClient.post(getEndpoint('/sdk-logs'), entry)
    } else {
        void _saveLocalLog(entry)
    }
}

export const log = {
    /**
     * Enable or disable debug mode.
     *
     * @param enabled - Pass `true` to enable, `false` to disable.
     */
    setMode(enabled: boolean): void {
        _debugMode = enabled
    },

    /**
     * Check whether debug mode is currently enabled.
     *
     * @returns `true` if debug mode is on.
     */
    isEnabled(): boolean {
        return _debugMode
    },

    /**
     * Mark the current session as a live (non-practice) presentation.
     *
     * @param uri - Optional URI or identifier to associate with the event.
     */
    liveMode(uri = ''): void {
        analytics.logEvent('session_live_mode', 'activate', uri)
    },

    /**
     * Mark the current session as a practice presentation.
     *
     * @param uri - Optional URI or identifier to associate with the event.
     */
    practiceMode(uri = ''): void {
        analytics.logEvent('session_live_mode', 'deactivate', uri)
    },

    /**
     * Retrieve structured SDK log entries with optional filtering.
     *
     * In the iOS app, fetches from the server-side GRDB table scoped to the current
     * team, user, presentation, and device session. Outside the app, reads from
     * IndexedDB via localforage (same entry shape, up to 1,000 entries).
     *
     * @param filter - Optional filter by level, domain, function, date range, retries, and limit.
     * @returns Array of {@link SDKLogEntry} objects, newest first.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * const errors = await mobilelocker.log.getSdkLogs({ level: 'error', domain: 'crm' })
     */
    async getSdkLogs(filter?: SDKLogFilter): Promise<SDKLogEntry[]> {
        if (isMobileLocker()) {
            const { data } = await withRetry(() =>
                apiClient.get<SDKLogEntry[]>(getEndpoint('/sdk-logs'), { params: filter }),
            )
            return data
        }
        let logs = await _localLogs()
        if (filter?.level) logs = logs.filter(l => l.level === filter.level)
        if (filter?.domain) logs = logs.filter(l => l.domain === filter.domain)
        if (filter?.function) logs = logs.filter(l => l.function === filter.function)
        if (filter?.since) logs = logs.filter(l => l.timestamp >= filter.since!)
        if (filter?.until) logs = logs.filter(l => l.timestamp <= filter.until!)
        if (filter?.retriesOnly) logs = logs.filter(l => (l.retryCount ?? 0) > 0)
        return logs.slice(-(filter?.limit ?? 100)).reverse()
    },

    /**
     * Full-text search across SDK log entries.
     *
     * Searches the `message` field and stringified `metadata`. Accepts the same
     * filter options as `getSdkLogs` to narrow the scope before searching.
     *
     * @param text - The search string.
     * @param filter - Optional pre-filter applied before the text search.
     * @returns Array of matching {@link SDKLogEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async searchSdkLogs(text: string, filter?: SDKLogFilter): Promise<SDKLogEntry[]> {
        if (isMobileLocker()) {
            const { data } = await withRetry(() =>
                apiClient.get<SDKLogEntry[]>(getEndpoint('/sdk-logs/search'), { params: { q: text, ...filter } }),
            )
            return data
        }
        const logs = await log.getSdkLogs(filter)
        const lower = text.toLowerCase()
        return logs.filter(l =>
            l.message.toLowerCase().includes(lower) ||
            (l.metadata && JSON.stringify(l.metadata).toLowerCase().includes(lower)),
        )
    },

    /**
     * Write a debug-level log entry into the SDK log store.
     *
     * @param message - Human-readable description of the event.
     * @param metadata - Optional key/value data to attach to the entry.
     */
    debug(message: string, metadata?: Record<string, unknown>): void { _writeLog('debug', message, metadata) },

    /**
     * Write an info-level log entry into the SDK log store.
     *
     * @param message - Human-readable description of the event.
     * @param metadata - Optional key/value data to attach to the entry.
     *
     * @example
     * mobilelocker.log.info('User selected product', { productId: 42, slide: 'overview' })
     */
    info(message: string, metadata?: Record<string, unknown>): void { _writeLog('info', message, metadata) },

    /**
     * Write a warn-level log entry into the SDK log store.
     *
     * @param message - Human-readable description of the event.
     * @param metadata - Optional key/value data to attach to the entry.
     */
    warn(message: string, metadata?: Record<string, unknown>): void { _writeLog('warn', message, metadata) },

    /**
     * Write an error-level log entry into the SDK log store.
     *
     * @param message - Human-readable description of the event.
     * @param metadata - Optional key/value data to attach to the entry.
     */
    error(message: string, metadata?: Record<string, unknown>): void { _writeLog('error', message, metadata) },

    /**
     * Delete a single SDK log entry by ID.
     *
     * @param id - The numeric ID of the entry to delete.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async deleteSdkLog(id: number): Promise<void> {
        if (isMobileLocker()) {
            await apiClient.delete(getEndpoint(`/sdk-logs/${id}`))
            return
        }
        const logs = await _localLogs()
        await localforage.setItem(LOCAL_STORAGE_KEY, logs.filter(l => l.id !== id))
    },

    /**
     * Delete all SDK log entries for the current presentation and user.
     *
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async clearSdkLogs(): Promise<void> {
        if (isMobileLocker()) {
            await apiClient.delete(getEndpoint('/sdk-logs'))
            return
        }
        await localforage.removeItem(LOCAL_STORAGE_KEY)
    },
}
