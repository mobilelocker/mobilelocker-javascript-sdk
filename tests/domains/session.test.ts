import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { analyticsMock, resetAnalyticsMock } from '../helpers/analytics-mock'

const env = createEnvMock({ hitSessionId: 'hit-uuid-1' })
vi.mock('../../src/env', () => env)
vi.mock('../../src/domains/analytics', () => ({
    analytics: analyticsMock,
    getLocalforageEvents: analyticsMock.getLocalforageEvents,
}))

const { session } = await import('../../src/domains/session')

describe('session', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
        analyticsMock.getLocalforageEvents.mockResolvedValue([{ id: 'local' }])
    })

    it('getDeviceEvents uses localforage outside Mobile Locker', async () => {
        await expect(session.getDeviceEvents()).resolves.toEqual([{ id: 'local' }])
        expect(analyticsMock.getLocalforageEvents).toHaveBeenCalled()
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('getDeviceEvents hits /session/events inside Mobile Locker', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({ data: [{ id: 'remote' }] })
        await expect(session.getDeviceEvents()).resolves.toEqual([{ id: 'remote' }])
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/session/events')
    })

    it('exposes hitSessionId from env', () => {
        expect(session.hitSessionId).toBe('hit-uuid-1')
    })
})
