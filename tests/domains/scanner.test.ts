import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { scanner } = await import('../../src/domains/scanner')

describe('scanner', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('throws UnsupportedEnvironment outside iOS', async () => {
        await expect(scanner.scanBusinessCard()).rejects.toMatchObject({
            code: GeneralErrorCode.UnsupportedEnvironment,
        })
        await expect(scanner.scanBadge(1)).rejects.toMatchObject({
            code: GeneralErrorCode.UnsupportedEnvironment,
        })
    })

    it('scanBusinessCard posts and wraps status booleans on iOS', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({
            data: { status: 'success', businessCard: { id: 1 } },
        })
        const result = await scanner.scanBusinessCard(99)
        expect(result.isSuccess).toBe(true)
        expect(result.isCancelled).toBe(false)
        expect(result.isFailed).toBe(false)
        expect(env.apiClient.post).toHaveBeenCalledWith(
            '/mobilelocker/api/open-scanner',
            { event_id: 99 },
            { timeout: 0 },
        )
    })

    it('scanBusinessCard omits body event_id when none is passed', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({
            data: { status: 'success', businessCard: { id: 2 } },
        })
        await scanner.scanBusinessCard()
        expect(env.apiClient.post).toHaveBeenCalledWith(
            '/mobilelocker/api/open-scanner',
            {},
            { timeout: 0 },
        )
    })

    it('scanBadge posts event_id', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({ data: { status: 'cancelled' } })
        const result = await scanner.scanBadge(7)
        expect(result.isCancelled).toBe(true)
        expect(env.apiClient.post).toHaveBeenCalledWith(
            '/mobilelocker/api/leadretrieval/open-badge-scanner',
            { event_id: 7 },
            { timeout: 0 },
        )
    })
})
