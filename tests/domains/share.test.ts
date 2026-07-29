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

const { share } = await import('../../src/domains/share')

describe('share', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
    })

    it('requires at least one recipient with email', () => {
        expect(() => share.presentation([])).toThrow(
            expect.objectContaining({ code: GeneralErrorCode.InvalidArgument }),
        )
        expect(() => share.presentation([{ email: '' }])).toThrow(
            expect.objectContaining({ code: GeneralErrorCode.InvalidArgument }),
        )
    })

    it('no-ops outside Mobile Locker after validation', () => {
        expect(() => share.presentation([{ email: 'a@b.com' }])).not.toThrow()
        expect(analyticsMock.logEvent).not.toHaveBeenCalled()
    })

    it('logs capturedata share event inside Mobile Locker', () => {
        env.isMobileLocker.mockReturnValue(true)
        share.presentation([{ email: 'a@b.com', name: 'A' }], 1, false)
        expect(analyticsMock.logEvent).toHaveBeenCalledWith(
            'share',
            'share-presentation',
            '/share',
            expect.objectContaining({
                notification_level: 1,
                send_reminders: false,
                recipients: [{ email: 'a@b.com', name: 'A' }],
            }),
            'capturedata',
        )
    })
})
