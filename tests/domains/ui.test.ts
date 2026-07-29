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

const { ui } = await import('../../src/domains/ui')

describe('ui', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
        vi.stubGlobal('open', vi.fn())
    })

    it('openPDF uses window.open outside app', () => {
        ui.openPDF('/files/a.pdf', 'Brochure')
        expect(window.open).toHaveBeenCalledWith('/files/a.pdf', '_blank')
        expect(analyticsMock.logEvent).not.toHaveBeenCalled()
    })

    it('openPDF logs showpdf event in app', () => {
        env.isApp.mockReturnValue(true)
        ui.openPDF('/files/a.pdf', 'Brochure', { page: 1 })
        expect(analyticsMock.logEvent).toHaveBeenCalledWith(
            'PDF',
            'Open',
            '/files/a.pdf',
            expect.objectContaining({ filename: '/files/a.pdf', title: 'Brochure', page: 1 }),
            'showpdf',
        )
    })

    it('showToolbar requires iOS', () => {
        expect(() => ui.showToolbar()).toThrow(
            expect.objectContaining({ code: GeneralErrorCode.UnsupportedEnvironment }),
        )

        env.isIOS.mockReturnValue(true)
        ui.showToolbar()
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/menu/show')
    })

    it('openVideo on iOS posts to bridge and wraps status booleans', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({
            data: { status: 'completed', position: 12.5 },
        })
        const result = await ui.openVideo('/files/demo.mp4', { autoplay: true })
        expect(result.isCompleted).toBe(true)
        expect(result.isDismissed).toBe(false)
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/ui/open-video', {
            path: '/files/demo.mp4',
            options: { autoplay: true },
        })
    })
})
