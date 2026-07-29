import { vi } from 'vitest'

/**
 * Shared analytics spies for domain tests that only care about side effects
 * (share, data, presentation, log, ui, session).
 *
 * Usage in a test file:
 *   import { analyticsMock } from '../helpers/analytics-mock'
 *   vi.mock('../../src/domains/analytics', () => ({
 *     analytics: analyticsMock,
 *     getLocalforageEvents: analyticsMock.getLocalforageEvents,
 *   }))
 */
export const analyticsMock = {
    logEvent: vi.fn(),
    _post: vi.fn(),
    getLocalforageEvents: vi.fn(async (): Promise<unknown[]> => []),
}

export function resetAnalyticsMock(): void {
    analyticsMock.logEvent.mockReset()
    analyticsMock._post.mockReset()
    analyticsMock.getLocalforageEvents.mockReset()
    analyticsMock.getLocalforageEvents.mockResolvedValue([])
}
