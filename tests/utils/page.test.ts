import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeneralErrorCode, MobileLockerError } from '../../src/errors'
import { pageOf } from '../helpers/env-mock'

// Inline hoisted mock — cannot call createEnvMock here (ESM import not ready during hoist).
const env = vi.hoisted(() => ({
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
    withRetry: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('../../src/env', () => env)

const {
    PAGE_LIMIT_MAX,
    PAGE_LIMIT_MIN,
    assertPageLimit,
    eachCursorPage,
    getCursorPage,
    pagedListAPI,
} = await import('../../src/utils/page')

describe('assertPageLimit', () => {
    it('accepts boundary values 1 and 5000', () => {
        expect(() => assertPageLimit(PAGE_LIMIT_MIN, 'limit')).not.toThrow()
        expect(() => assertPageLimit(PAGE_LIMIT_MAX, 'limit')).not.toThrow()
        expect(() => assertPageLimit(500, 'pageSize')).not.toThrow()
    })

    it.each([0, -1, 5001, 1.5, NaN, Infinity])(
        'rejects invalid limit %s with InvalidArgument',
        (value) => {
            expect(() => assertPageLimit(value, 'limit')).toThrow(MobileLockerError)
            try {
                assertPageLimit(value, 'limit')
            } catch (err) {
                expect(err).toMatchObject({
                    code: GeneralErrorCode.InvalidArgument,
                    message: expect.stringMatching(/limit must be an integer between 1 and 5000/),
                })
            }
        },
    )
})

describe('eachCursorPage', () => {
    it('walks pages using only meta.cursor.next and stops when next is null', async () => {
        const fetchPage = vi.fn()
            .mockResolvedValueOnce(pageOf([{ id: 1 }, { id: 2 }], 'cursor-a'))
            .mockResolvedValueOnce(pageOf([{ id: 3 }], 'cursor-b'))
            .mockResolvedValueOnce(pageOf([{ id: 4 }], null))

        const chunks: number[][] = []
        await eachCursorPage(fetchPage, 2, (chunk) => {
            chunks.push(chunk.map((r) => (r as { id: number }).id))
        })

        expect(chunks).toEqual([[1, 2], [3], [4]])
        expect(fetchPage).toHaveBeenCalledTimes(3)
        expect(fetchPage).toHaveBeenNthCalledWith(1, 2, undefined)
        expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 'cursor-a')
        expect(fetchPage).toHaveBeenNthCalledWith(3, 2, 'cursor-b')
    })

    it('stops on empty page even if next is non-null (defensive host behaviour)', async () => {
        const fetchPage = vi.fn().mockResolvedValue(pageOf([], 'should-not-follow'))
        const handler = vi.fn()
        await eachCursorPage(fetchPage, 10, handler)
        expect(handler).not.toHaveBeenCalled()
        expect(fetchPage).toHaveBeenCalledTimes(1)
    })

    it('does not call handler for empty first page', async () => {
        const fetchPage = vi.fn().mockResolvedValue(pageOf([], null))
        const handler = vi.fn()
        await eachCursorPage(fetchPage, 50, handler)
        expect(handler).not.toHaveBeenCalled()
    })

    it('awaits async handlers before fetching the next page', async () => {
        const order: string[] = []
        const fetchPage = vi.fn()
            .mockImplementationOnce(async () => {
                order.push('fetch-1')
                return pageOf([{ id: 1 }], 'c2')
            })
            .mockImplementationOnce(async () => {
                order.push('fetch-2')
                return pageOf([{ id: 2 }], null)
            })

        await eachCursorPage(fetchPage, 10, async () => {
            order.push('handler-start')
            await Promise.resolve()
            order.push('handler-end')
        })

        expect(order).toEqual([
            'fetch-1', 'handler-start', 'handler-end',
            'fetch-2', 'handler-start', 'handler-end',
        ])
    })

    it('validates pageSize before any fetch', async () => {
        const fetchPage = vi.fn()
        await expect(eachCursorPage(fetchPage, 0, () => undefined)).rejects.toMatchObject({
            code: GeneralErrorCode.InvalidArgument,
        })
        expect(fetchPage).not.toHaveBeenCalled()
    })
})

describe('getCursorPage', () => {
    beforeEach(() => {
        env.apiClient.get.mockReset()
    })

    it('GETs with limit only when cursor is omitted', async () => {
        env.apiClient.get.mockResolvedValue({ data: pageOf([{ id: 1 }], null) })
        const mapError = vi.fn((e: unknown) => e as Error)

        const page = await getCursorPage('/user-contacts', 100, undefined, mapError)

        expect(page.data).toHaveLength(1)
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user-contacts', {
            params: { limit: 100 },
        })
        expect(mapError).not.toHaveBeenCalled()
    })

    it('includes cursor in params when provided', async () => {
        env.apiClient.get.mockResolvedValue({ data: pageOf([], null) })
        await getCursorPage('/crm/accounts', 25, 'abc', (e) => e as Error)

        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/crm/accounts', {
            params: { limit: 25, cursor: 'abc' },
        })
    })

    it('maps network/server errors via mapError', async () => {
        const boom = new Error('network')
        env.apiClient.get.mockRejectedValue(boom)
        const mapped = new MobileLockerError('mapped', GeneralErrorCode.ServerError)
        const mapError = vi.fn(() => mapped)

        await expect(getCursorPage('/user-contacts', 10, undefined, mapError)).rejects.toBe(mapped)
        expect(mapError).toHaveBeenCalledWith(boom)
    })

    it('does not remap InvalidArgument from limit validation', async () => {
        const mapError = vi.fn()
        await expect(getCursorPage('/user-contacts', 99999, undefined, mapError)).rejects.toMatchObject({
            code: GeneralErrorCode.InvalidArgument,
        })
        expect(mapError).not.toHaveBeenCalled()
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })
})

describe('pagedListAPI', () => {
    beforeEach(() => {
        env.apiClient.get.mockReset()
    })

    it('binds getPage and eachPage to the same path', async () => {
        const list = pagedListAPI<{ n: number }>('/user-contacts', (e) => e as Error)

        env.apiClient.get.mockResolvedValueOnce({ data: pageOf([{ n: 1 }], 'next') })
        const first = await list.getPage(2)
        expect(first.meta.cursor.next).toBe('next')
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user-contacts', {
            params: { limit: 2 },
        })

        env.apiClient.get.mockReset()
        env.apiClient.get
            .mockResolvedValueOnce({ data: pageOf([{ n: 1 }], 'next') })
            .mockResolvedValueOnce({ data: pageOf([{ n: 2 }], null) })

        const seen: number[] = []
        await list.eachPage(2, (chunk) => {
            seen.push(...chunk.map((c) => c.n))
        })
        expect(seen).toEqual([1, 2])
        expect(env.apiClient.get).toHaveBeenNthCalledWith(1, '/mobilelocker/api/user-contacts', {
            params: { limit: 2 },
        })
        expect(env.apiClient.get).toHaveBeenNthCalledWith(2, '/mobilelocker/api/user-contacts', {
            params: { limit: 2, cursor: 'next' },
        })
    })
})
