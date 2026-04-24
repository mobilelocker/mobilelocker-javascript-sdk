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
    timestamp: string
    level: SDKLogLevel
    domain: SDKLogDomain
    function: string | null
    message: string
    durationMs: number | null
    retryCount: number | null
    metadata: Record<string, unknown> | null
}

export interface SDKLogFilter {
    level?: SDKLogLevel
    domain?: SDKLogDomain
    function?: string
    since?: string
    until?: string
    retriesOnly?: boolean
    limit?: number
}

const MAX_LOCAL_LOGS = 1000
const LOCAL_STORAGE_KEY = 'ml_sdk_logs'

let _debugMode = false
let _localLogId = 0

function _localLogs(): Promise<SDKLogEntry[]> {
    return localforage.getItem<SDKLogEntry[]>(LOCAL_STORAGE_KEY).then(v => v ?? [])
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
    setMode(enabled: boolean): void {
        _debugMode = typeof enabled === 'boolean' ? enabled : false
    },

    isEnabled(): boolean {
        return _debugMode
    },

    // Legacy v4 log methods (kept for compatibility with existing presentations)
    getLogs(): SDKLogEntry[] { return [] },
    getLogsFiltered(_filter: object): SDKLogEntry[] { return [] },
    clearLogs(): void {},

    liveMode(uri = ''): void {
        analytics.logEvent('session_live_mode', 'activate', uri)
    },

    practiceMode(uri = ''): void {
        analytics.logEvent('session_live_mode', 'deactivate', uri)
    },

    // SDK structured log store
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

    debug(message: string, metadata?: Record<string, unknown>): void { _writeLog('debug', message, metadata) },
    info(message: string, metadata?: Record<string, unknown>): void { _writeLog('info', message, metadata) },
    warn(message: string, metadata?: Record<string, unknown>): void { _writeLog('warn', message, metadata) },
    error(message: string, metadata?: Record<string, unknown>): void { _writeLog('error', message, metadata) },

    async deleteSdkLog(id: number): Promise<void> {
        if (isMobileLocker()) {
            await apiClient.delete(getEndpoint(`/sdk-logs/${id}`))
            return
        }
        const logs = await _localLogs()
        await localforage.setItem(LOCAL_STORAGE_KEY, logs.filter(l => l.id !== id))
    },

    async clearSdkLogs(): Promise<void> {
        if (isMobileLocker()) {
            await apiClient.delete(getEndpoint('/sdk-logs'))
            return
        }
        await localforage.removeItem(LOCAL_STORAGE_KEY)
    },
}
