import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { analyticsMock, resetAnalyticsMock } from '../helpers/analytics-mock'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)
vi.mock('../../src/domains/analytics', () => ({
    analytics: analyticsMock,
    getLocalforageEvents: analyticsMock.getLocalforageEvents,
}))

const { presentation } = await import('../../src/domains/presentation')

describe('presentation', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
        vi.stubGlobal('open', vi.fn())
    })

    it('get / getEvents / getAll hit bridge routes', async () => {
        env.apiClient.get.mockResolvedValue({ data: { id: 1 } })
        await presentation.get()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentation')

        env.apiClient.get.mockResolvedValue({ data: [] })
        await presentation.getEvents()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentation/events')

        await presentation.getDeviceEvents()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentation/events')

        await presentation.getAll()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentations')
    })

    it('getByID / getByName use query params', async () => {
        env.apiClient.get.mockResolvedValue({ data: { id: 7 } })
        await presentation.getByID(7)
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentations/by-id', {
            params: { id: 7 },
        })
        await presentation.getByName('Demo')
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/presentations/by-name', {
            params: { name: 'Demo' },
        })
    })

    it('download wraps status booleans', async () => {
        env.apiClient.post.mockResolvedValue({ data: { status: 'queued' } })
        const result = await presentation.download(3)
        expect(result.isQueued).toBe(true)
        expect(result.isAlreadyInstalled).toBe(false)
        expect(result.isNotAvailable).toBe(false)
        expect(result.isNotPermitted).toBe(false)
    })

    it('openByID uses window.open outside iOS', () => {
        presentation.openByID(42)
        expect(window.open).toHaveBeenCalledWith(
            'https://app.mobilelocker.com/v2/app/content/42/open',
            '_blank',
        )
    })

    it('openByID uses bridge on iOS', () => {
        env.isIOS.mockReturnValue(true)
        presentation.openByID(42)
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/open-presentation', {
            params: { id: 42 },
        })
    })

    it('openByName / openByExternalID throw NotFound when missing', async () => {
        env.apiClient.get.mockResolvedValue({ data: [] })
        await expect(presentation.openByName('Nope')).rejects.toMatchObject({
            code: GeneralErrorCode.NotFound,
        })
        await expect(presentation.openByExternalID('x')).rejects.toMatchObject({
            code: GeneralErrorCode.NotFound,
        })
    })

    it('openByName opens matching presentation in browser', async () => {
        env.apiClient.get.mockResolvedValue({
            data: [{ id: 9, name: 'Demo', external_id: 'ext' }],
        })
        await presentation.openByName('Demo')
        expect(window.open).toHaveBeenCalledWith(
            'https://app.mobilelocker.com/v2/app/content/9/open',
            '_blank',
        )
    })

    it('openPicker requires iOS', () => {
        expect(() => presentation.openPicker()).toThrow(
            expect.objectContaining({ code: GeneralErrorCode.UnsupportedEnvironment }),
        )
        env.isIOS.mockReturnValue(true)
        presentation.openPicker()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/open-presentation-picker')
    })

    it('close posts dedicated close-presentation route', async () => {
        env.apiClient.post.mockResolvedValue({ data: { status: 'ok' } })
        presentation.close()
        // close() is fire-and-forget async — flush microtasks
        await vi.waitFor(() => {
            expect(env.apiClient.post).toHaveBeenCalledWith(
                '/mobilelocker/api/close-presentation',
                {},
            )
        })
        expect(analyticsMock.logEvent).not.toHaveBeenCalled()
    })

    it('close falls back to legacy method event when dedicated route fails', async () => {
        env.apiClient.post.mockRejectedValue(new Error('not found'))
        presentation.close()
        await vi.waitFor(() => {
            expect(analyticsMock.logEvent).toHaveBeenCalledWith(
                'presentation',
                'close',
                'close-presentation',
                null,
                'close-presentation',
            )
        })
    })
})
