import { vi, type Mock } from 'vitest'
import type { Page } from '../../src/types/page'

export type ApiClientMock = {
    get: Mock
    post: Mock
    put: Mock
    delete: Mock
    patch: Mock
}

export type EnvMock = {
    apiClient: ApiClientMock
    getEndpoint: (uri?: string) => string
    getBaseURL: () => string
    withRetry: <T>(fn: () => Promise<T>) => Promise<T>
    isIOS: Mock
    isAndroid: Mock
    isWindows: Mock
    isElectron: Mock
    isApp: Mock
    isCDN: Mock
    isMobileLocker: Mock
    userID: number | null
    jwt: Record<string, unknown> | null
    token: string | null
    fallbackSessionId: string
    fallbackSessionStartedAt: string
    hitSessionId: string | null
    hitSessionNumericId: number | null
    hitSessionStartedAt: string | null
    hitSessionReady: Promise<void>
}

/** Flag overrides only — apiClient is always a fresh set of vi.fn mocks. */
export type EnvMockOptions = {
    isIOS?: boolean
    isAndroid?: boolean
    isWindows?: boolean
    isElectron?: boolean
    isApp?: boolean
    isCDN?: boolean
    isMobileLocker?: boolean
    userID?: number | null
    jwt?: Record<string, unknown> | null
    token?: string | null
    hitSessionId?: string | null
    hitSessionNumericId?: number | null
    hitSessionStartedAt?: string | null
}

function flag(defaultValue: boolean): Mock {
    return vi.fn(() => defaultValue)
}

/**
 * Build a complete `src/env` mock for domain tests.
 *
 * Prefer boolean options over hand-built `vi.fn`s:
 *   createEnvMock({ isMobileLocker: true, isIOS: false })
 */
export function createEnvMock(options: EnvMockOptions = {}): EnvMock {
    return {
        apiClient: {
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            patch: vi.fn(),
        },
        getEndpoint: (uri = '') => {
            if (uri && !uri.startsWith('/')) uri = `/${uri}`
            return `/mobilelocker/api${uri}`
        },
        getBaseURL: () => '',
        withRetry: async <T>(fn: () => Promise<T>) => fn(),
        isIOS: flag(options.isIOS ?? false),
        isAndroid: flag(options.isAndroid ?? false),
        isWindows: flag(options.isWindows ?? false),
        isElectron: flag(options.isElectron ?? false),
        isApp: flag(options.isApp ?? false),
        isCDN: flag(options.isCDN ?? false),
        isMobileLocker: flag(options.isMobileLocker ?? false),
        userID: options.userID ?? null,
        jwt: options.jwt ?? null,
        token: options.token ?? null,
        fallbackSessionId: 'fallback-session-id',
        fallbackSessionStartedAt: '2026-01-01T00:00:00.000Z',
        hitSessionId: options.hitSessionId ?? null,
        hitSessionNumericId: options.hitSessionNumericId ?? null,
        hitSessionStartedAt: options.hitSessionStartedAt ?? null,
        hitSessionReady: Promise.resolve(),
    }
}

/**
 * Reset HTTP mocks and restore env flags.
 * Always re-applies boolean defaults (false unless overridden) so a prior
 * `mockReturnValue(true)` cannot leak into the next test.
 */
export function resetEnvMock(env: EnvMock, flags: EnvMockOptions = {}): void {
    for (const method of Object.values(env.apiClient)) {
        method.mockReset()
    }
    env.isIOS.mockReset()
    env.isAndroid.mockReset()
    env.isWindows.mockReset()
    env.isElectron.mockReset()
    env.isApp.mockReset()
    env.isCDN.mockReset()
    env.isMobileLocker.mockReset()
    env.isIOS.mockReturnValue(flags.isIOS ?? false)
    env.isAndroid.mockReturnValue(flags.isAndroid ?? false)
    env.isWindows.mockReturnValue(flags.isWindows ?? false)
    env.isElectron.mockReturnValue(flags.isElectron ?? false)
    env.isApp.mockReturnValue(flags.isApp ?? false)
    env.isCDN.mockReturnValue(flags.isCDN ?? false)
    env.isMobileLocker.mockReturnValue(flags.isMobileLocker ?? false)
}

/** Cursor-envelope page fixture (MLI-1718 / SDK 2.0 host contract). */
export function pageOf<T>(data: T[], next: string | null = null): Page<T> {
    return {
        data,
        meta: {
            cursor: {
                next,
                count: data.length,
            },
        },
    }
}
