import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { analyticsMock, resetAnalyticsMock } from '../helpers/analytics-mock'

const env = createEnvMock()
vi.mock('../../src/env', () => env)
vi.mock('../../src/domains/analytics', () => ({
    analytics: analyticsMock,
    getLocalforageEvents: analyticsMock.getLocalforageEvents,
}))

const { log } = await import('../../src/domains/log')

describe('log', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
        log.setMode(false)
    })

    it('setMode / isEnabled toggle debug mode', () => {
        expect(log.isEnabled()).toBe(false)
        log.setMode(true)
        expect(log.isEnabled()).toBe(true)
        log.setMode(false)
        expect(log.isEnabled()).toBe(false)
    })

    it('liveMode / practiceMode emit analytics events', () => {
        log.liveMode('/p')
        expect(analyticsMock.logEvent).toHaveBeenCalledWith('session_live_mode', 'activate', '/p')
        log.practiceMode('/p')
        expect(analyticsMock.logEvent).toHaveBeenCalledWith('session_live_mode', 'deactivate', '/p')
    })

    it('writes levels to local store outside Mobile Locker and can query them', async () => {
        // Sequential: concurrent void _saveLocalLog calls race on read/modify/write.
        log.info('hello world', { a: 1 })
        await vi.waitFor(async () => {
            const entries = await log.getSdkLogs()
            expect(entries.some((e) => e.message === 'hello world')).toBe(true)
        })

        log.error('boom')
        await vi.waitFor(async () => {
            const entries = await log.getSdkLogs()
            expect(entries.some((e) => e.message === 'boom')).toBe(true)
        })

        const errors = await log.getSdkLogs({ level: 'error' })
        expect(errors.length).toBeGreaterThanOrEqual(1)
        expect(errors.every((e) => e.level === 'error')).toBe(true)

        const found = await log.searchSdkLogs('hello')
        expect(found.some((e) => e.message.includes('hello'))).toBe(true)
    })

    it('getSdkLogs hits bridge when in Mobile Locker', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({ data: [] })
        await log.getSdkLogs({ domain: 'crm', limit: 10 })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/sdk-logs', {
            params: { domain: 'crm', limit: 10 },
        })
    })

    it('does not expose removed deleteSdkLog / clearSdkLogs', () => {
        expect(log).not.toHaveProperty('deleteSdkLog')
        expect(log).not.toHaveProperty('clearSdkLogs')
    })
})
