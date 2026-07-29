import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { analytics, getLocalforageEvents } = await import('../../src/domains/analytics')

describe('analytics', () => {
    beforeEach(() => {
        resetEnvMock(env)
        env.userID = null
    })

    it('buffers events to localforage outside Mobile Locker', async () => {
        analytics.logEvent('product', 'view', '/slides/1', { id: 1 })
        await vi.waitFor(async () => {
            const events = await getLocalforageEvents()
            expect(events.length).toBeGreaterThanOrEqual(1)
        })
        const events = await getLocalforageEvents() as Array<Record<string, unknown>>
        expect(events[events.length - 1]).toMatchObject({
            category: 'product',
            action: 'view',
            uri: '/slides/1',
            method: 'trackevent',
        })
        expect(env.apiClient.post).not.toHaveBeenCalled()
    })

    it('posts to root endpoint in app environment', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.isApp.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({})

        await analytics._post('cat', 'act', '/uri', { x: 1 }, 'trackevent')
        expect(env.apiClient.post).toHaveBeenCalledWith(
            '/mobilelocker/api',
            expect.objectContaining({
                method: 'trackevent',
                category: 'cat',
                action: 'act',
                uri: '/uri',
                path: '/uri',
                data: { x: 1 },
            }),
        )
    })

    it('getLocalforageEvents throws inside Mobile Locker', async () => {
        env.isMobileLocker.mockReturnValue(true)
        await expect(getLocalforageEvents()).rejects.toMatchObject({
            code: 'unsupported_environment',
        })
    })
})
