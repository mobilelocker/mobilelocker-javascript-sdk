import axios, { type AxiosInstance } from 'axios'
import { GeneralErrorCode, MobileLockerError, MobileLockerCRMError, CRMErrorCode } from './errors'

declare global {
    interface Window {
        IS_MOBILE_LOCKER_IOS_APP?: boolean
        SQL?: unknown
        initSqlJs?: (config: object) => Promise<unknown>
    }
}

// ── Environment detection ────────────────────────────────────────────────────

let _isAppCached: boolean | null = null
let _isCDNCached: boolean | null = null

export function isMobileLockerIOSApp(): boolean {
    if (window.IS_MOBILE_LOCKER_IOS_APP === true) return true
    const ua = navigator?.userAgent?.toLowerCase() ?? ''
    return ua.startsWith('mobilelocker-ios') || ua.startsWith('mobilelocker-ipados')
}

export function isMobileLockerApp(): boolean {
    if (_isAppCached === null) {
        _isAppCached = isMobileLockerIOSApp() ||
            typeof (globalThis as Record<string, unknown>)['ML_ENVIRONMENT'] !== 'undefined' ||
            navigator.userAgent.indexOf('Locker') !== -1
    }
    return _isAppCached
}

export function isMobileLockerCDN(): boolean {
    if (_isCDNCached === null) {
        const host = window.location?.hostname ?? ''
        _isCDNCached = host.endsWith('.app.mobilelocker.com') ||
            host.endsWith('.eu.mobilelocker.com') ||
            host.endsWith('.staging.mobilelocker.com') ||
            host.endsWith('.dev.mobilelocker.com')
    }
    return _isCDNCached
}

export function isMobileLocker(): boolean {
    return isMobileLockerApp() || isMobileLockerCDN()
}

// ── JWT ──────────────────────────────────────────────────────────────────────

interface MobileLockerJWT {
    base_url: string
    presentation_id: number
    team_id: number
    user_id: number | null
    expires: number
    device: { id: number; uuid: string } | null
    payload: { session_uuid?: string; session_started_at?: string }
}

function readToken(): string | null {
    try {
        const params = new URLSearchParams(window.location.search)
        const fromUrl = params.get('jwt')
        if (fromUrl) {
            sessionStorage.setItem('ml_token', fromUrl)
            return fromUrl
        }
        return sessionStorage.getItem('ml_token')
    } catch {
        return null
    }
}

function parseToken(token: string | null): MobileLockerJWT | null {
    if (!token) return null
    try {
        return JSON.parse(atob(token.split('.')[1])) as MobileLockerJWT
    } catch {
        return null
    }
}

export const token = readToken()
export const jwt = parseToken(token)

// ── Endpoint helpers ─────────────────────────────────────────────────────────

export function getBaseURL(): string {
    if (isMobileLockerCDN() && jwt?.base_url) return `${jwt.base_url}/api/browser`
    return ''
}

export function getEndpoint(uri = ''): string {
    if (uri && !uri.startsWith('/')) uri = `/${uri}`
    if (isMobileLockerCDN() && jwt?.base_url) return `${jwt.base_url}/api/browser${uri}`
    return `/mobilelocker/api${uri}`
}

// ── Internal API client ──────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
    baseURL: getBaseURL(),
    timeout: 30_000,
})

apiClient.interceptors.request.use(config => {
    if (jwt?.device) {
        const device = jwt.device
        config.headers['Authorization'] = `Bearer ${token}`
        config.headers['X-ML-TOKEN'] = token
        config.headers['X-ML-DEVICE-UUID'] = device.uuid
        config.headers['X-ML-DEVICE-NAME'] = device.uuid
        config.headers['X-ML-DEVICE-SYSTEM-NAME'] = navigator.platform
        config.headers['X-ML-DEVICE-MODEL'] = 'browser'
        config.headers['X-ML-DEVICE-LOCAL-MODEL'] = 'browser'
        config.headers['X-ML-DEVICE-APP-NAME'] = 'app.mobilelocker.com'
        config.headers['X-ML-DEVICE-APP-VERSION'] = 0
        config.headers['X-ML-DEVICE-APP-BUILD'] = 0
        if (jwt.payload?.session_uuid) {
            config.headers['X-ML-SESSION-UUID'] = jwt.payload.session_uuid
        }
    }
    return config
})

// ── Retry ────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(err: unknown): boolean {
    if (err instanceof MobileLockerError && err.code === GeneralErrorCode.NotConnected) return false
    if (err instanceof MobileLockerCRMError && err.code === CRMErrorCode.NotSupported) return false
    if (axios.isAxiosError(err)) {
        if (!err.response) return true
        const s = err.response.status
        return s >= 500
    }
    return false
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const MAX = 3
    for (let attempt = 0; attempt < MAX; attempt++) {
        try {
            return await fn()
        } catch (err) {
            if (!isRetryable(err) || attempt === MAX - 1) throw err
            await sleep(500 * Math.pow(2, attempt))
        }
    }
    throw new Error('unreachable')
}

// ── Session fallback (for non-ML environments) ───────────────────────────────

import { v4 as uuidv4 } from 'uuid'

export const fallbackSessionId = uuidv4()
export const fallbackSessionStartedAt = new Date().toISOString()
export const userID = jwt?.user_id ?? null
