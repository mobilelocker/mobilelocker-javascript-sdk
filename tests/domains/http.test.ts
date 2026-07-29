import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import {
    GeneralErrorCode,
    MobileLockerHTTPError,
    MobileLockerHttpResponseError,
} from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { http } = await import('../../src/domains/http')

function mockFetchResponse(init: {
    ok?: boolean
    status?: number
    statusText?: string
    body?: unknown
    headers?: Record<string, string>
}) {
    const headers = new Headers(init.headers ?? { 'content-type': 'application/json' })
    vi.mocked(fetch).mockResolvedValue({
        ok: init.ok ?? true,
        status: init.status ?? 200,
        statusText: init.statusText ?? 'OK',
        headers,
        json: async () => init.body ?? {},
        text: async () => JSON.stringify(init.body ?? {}),
        blob: async () => new Blob(),
    } as Response)
}

describe('http browser path', () => {
    beforeEach(() => {
        resetEnvMock(env)
        vi.stubGlobal('fetch', vi.fn())
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            get: () => true,
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('GET returns parsed JSON on success', async () => {
        mockFetchResponse({ body: { hello: 'world' } })
        const res = await http.get('https://example.com/api')
        expect(res.status).toBe(200)
        expect(res.data).toEqual({ hello: 'world' })
        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/api',
            expect.objectContaining({ method: 'GET' }),
        )
    })

    it('POST serializes body as JSON', async () => {
        mockFetchResponse({ body: { ok: true } })
        await http.post('https://example.com/api', { a: 1 })
        expect(fetch).toHaveBeenCalledWith(
            'https://example.com/api',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ a: 1 }),
            }),
        )
    })

    it('throws MobileLockerHttpResponseError on non-2xx', async () => {
        mockFetchResponse({ ok: false, status: 422, statusText: 'Unprocessable', body: { e: 1 } })
        await expect(http.get('https://example.com/x')).rejects.toBeInstanceOf(MobileLockerHttpResponseError)
        await expect(http.get('https://example.com/x')).rejects.toMatchObject({
            status: 422,
            statusText: 'Unprocessable',
            data: { e: 1 },
            code: GeneralErrorCode.ServerError,
        })
    })

    it('throws RequestTimeout when fetch aborts', async () => {
        vi.mocked(fetch).mockRejectedValue(new DOMException('Aborted', 'AbortError'))
        await expect(http.get('https://example.com/slow')).rejects.toBeInstanceOf(MobileLockerHTTPError)
        await expect(http.get('https://example.com/slow')).rejects.toMatchObject({
            code: GeneralErrorCode.RequestTimeout,
        })
    })

    it('throws NotConnected when offline', async () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            get: () => false,
        })
        vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
        await expect(http.get('https://example.com')).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})

describe('http app proxy path', () => {
    beforeEach(() => {
        resetEnvMock(env, { isApp: true })
    })

    it('proxies through /http/request on native app', async () => {
        env.apiClient.post.mockResolvedValue({
            data: { status: 200, statusText: 'OK', headers: {}, data: { via: 'proxy' } },
        })
        const res = await http.get('https://external.example/api')
        expect(res.data).toEqual({ via: 'proxy' })
        expect(env.apiClient.post).toHaveBeenCalledWith(
            '/mobilelocker/api/http/request',
            expect.objectContaining({
                url: 'https://external.example/api',
                method: 'GET',
            }),
        )
    })
})
