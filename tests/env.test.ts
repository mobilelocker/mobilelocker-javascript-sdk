import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * env.ts caches isApp / isCDN at module level and reads JWT at import time.
 * Each case reloads the module after configuring window/navigator/location.
 */
async function loadEnv() {
    vi.resetModules()
    return import('../src/env')
}

function setLocation(url: string) {
    // happy-dom supports full navigation via location.href
    window.location.href = url
}

function setUserAgent(ua: string) {
    Object.defineProperty(navigator, 'userAgent', {
        configurable: true,
        get: () => ua,
    })
}

describe('environment detection', () => {
    beforeEach(() => {
        delete window.IS_MOBILE_LOCKER_IOS_APP
        delete window.IS_MOBILE_LOCKER_ANDROID_APP
        delete window.IS_MOBILE_LOCKER_WINDOWS_APP
        delete (globalThis as Record<string, unknown>)['ML_ENVIRONMENT']
        setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36')
        setLocation('http://localhost:5173/')
        sessionStorage.clear()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('detects iOS via window flag', async () => {
        window.IS_MOBILE_LOCKER_IOS_APP = true
        const env = await loadEnv()
        expect(env.isIOS()).toBe(true)
        expect(env.isApp()).toBe(true)
        expect(env.isMobileLocker()).toBe(true)
        expect(env.isAndroid()).toBe(false)
        expect(env.isWindows()).toBe(false)
    })

    it('detects iOS via user agent prefixes', async () => {
        setUserAgent('mobilelocker-ios/5.5.0')
        let env = await loadEnv()
        expect(env.isIOS()).toBe(true)

        setUserAgent('mobilelocker-ipados/5.5.0')
        env = await loadEnv()
        expect(env.isIOS()).toBe(true)
    })

    it('detects Android via flag and user agent', async () => {
        window.IS_MOBILE_LOCKER_ANDROID_APP = true
        let env = await loadEnv()
        expect(env.isAndroid()).toBe(true)
        expect(env.isApp()).toBe(true)

        delete window.IS_MOBILE_LOCKER_ANDROID_APP
        setUserAgent('mobilelocker-android/2.0')
        env = await loadEnv()
        expect(env.isAndroid()).toBe(true)
        expect(env.isWindows()).toBe(false)
    })

    it('detects Electron via Mobile Locker UA without iOS', async () => {
        setUserAgent('Mobile Locker Electron/1.0')
        const env = await loadEnv()
        expect(env.isElectron()).toBe(true)
        expect(env.isWindows()).toBe(true)
        expect(env.isApp()).toBe(true)
        expect(env.isIOS()).toBe(false)
        expect(env.isAndroid()).toBe(false)
    })

    it('detects Windows via window flag', async () => {
        window.IS_MOBILE_LOCKER_WINDOWS_APP = true
        const env = await loadEnv()
        expect(env.isWindows()).toBe(true)
        expect(env.isApp()).toBe(true)
        expect(env.isMobileLocker()).toBe(true)
        expect(env.isElectron()).toBe(false)
        expect(env.isIOS()).toBe(false)
        expect(env.isAndroid()).toBe(false)
    })

    it('detects Windows via user agent prefix', async () => {
        setUserAgent('mobilelocker-windows/1.0')
        const env = await loadEnv()
        expect(env.isWindows()).toBe(true)
        expect(env.isApp()).toBe(true)
        expect(env.isElectron()).toBe(false)
        expect(env.isIOS()).toBe(false)
        expect(env.isAndroid()).toBe(false)
    })

    it('isCDN matches app/eu/staging/dev hosts and subdomains', async () => {
        const hosts = [
            'app.mobilelocker.com',
            'cdn.app.mobilelocker.com',
            'eu.mobilelocker.com',
            'team.eu.mobilelocker.com',
            'staging.mobilelocker.com',
            'foo.staging.mobilelocker.com',
            'dev.mobilelocker.com',
            'bar.dev.mobilelocker.com',
        ]

        for (const host of hosts) {
            setLocation(`https://${host}/presentations/1`)
            const env = await loadEnv()
            expect(env.isCDN(), host).toBe(true)
            expect(env.isMobileLocker(), host).toBe(true)
        }
    })

    it('isCDN is false for non-ML hostnames', async () => {
        setLocation('https://example.com/')
        const env = await loadEnv()
        expect(env.isCDN()).toBe(false)
        expect(env.isMobileLocker()).toBe(false)
    })

    it('isCDN is false for bare mobilelocker.com without known subdomain', async () => {
        setLocation('https://mobilelocker.com/')
        const env = await loadEnv()
        expect(env.isCDN()).toBe(false)
    })

    it('treats ML_ENVIRONMENT as app', async () => {
        ;(globalThis as Record<string, unknown>)['ML_ENVIRONMENT'] = 'ios'
        const env = await loadEnv()
        expect(env.isApp()).toBe(true)
    })
})

describe('getEndpoint / getBaseURL', () => {
    beforeEach(() => {
        delete window.IS_MOBILE_LOCKER_IOS_APP
        setUserAgent('Mozilla/5.0')
        sessionStorage.clear()
    })

    it('uses relative /mobilelocker/api paths outside CDN', async () => {
        setLocation('http://localhost/')
        const env = await loadEnv()
        expect(env.getEndpoint()).toBe('/mobilelocker/api')
        expect(env.getEndpoint('/user')).toBe('/mobilelocker/api/user')
        expect(env.getEndpoint('user')).toBe('/mobilelocker/api/user')
        expect(env.getBaseURL()).toBe('')
    })

    it('uses JWT base_url on CDN when jwt is present', async () => {
        const payload = {
            base_url: 'https://api.mobilelocker.com',
            presentation_id: 1,
            team_id: 2,
            user_id: 3,
            expires: 9999999999,
            device: null,
            payload: {},
        }
        // minimal JWT: header.payload.sig with base64 payload
        const token = `hdr.${btoa(JSON.stringify(payload))}.sig`
        setLocation(`https://app.mobilelocker.com/p?jwt=${token}`)
        const env = await loadEnv()
        expect(env.isCDN()).toBe(true)
        expect(env.getBaseURL()).toBe('https://api.mobilelocker.com/api/browser')
        expect(env.getEndpoint('/user')).toBe('https://api.mobilelocker.com/api/browser/user')
    })
})

describe('withRetry', () => {
    beforeEach(() => {
        setLocation('http://localhost/')
        setUserAgent('Mozilla/5.0')
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('returns on first success', async () => {
        const env = await loadEnv()
        const fn = vi.fn().mockResolvedValue('ok')
        await expect(env.withRetry(fn)).resolves.toBe('ok')
        expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries retryable axios 5xx then succeeds', async () => {
        const env = await loadEnv()
        const { makeAxiosError } = await import('./helpers/axios')
        const fn = vi.fn()
            .mockRejectedValueOnce(makeAxiosError('server', { status: 503 }))
            .mockResolvedValueOnce('recovered')

        const promise = env.withRetry(fn)
        await vi.runAllTimersAsync()
        await expect(promise).resolves.toBe('recovered')
        expect(fn).toHaveBeenCalledTimes(2)
    })

    it('does not retry NotConnected MobileLockerError', async () => {
        const env = await loadEnv()
        const { MobileLockerError, GeneralErrorCode } = await import('../src/errors')
        const err = new MobileLockerError('offline', GeneralErrorCode.NotConnected)
        const fn = vi.fn().mockRejectedValue(err)

        await expect(env.withRetry(fn)).rejects.toBe(err)
        expect(fn).toHaveBeenCalledTimes(1)
    })
})
