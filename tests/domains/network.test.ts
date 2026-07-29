import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { network } = await import('../../src/domains/network')

describe('network', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('browser fallback uses navigator.onLine', async () => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true })
        await expect(network.getStatus()).resolves.toEqual({ connected: true, type: 'wifi' })

        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false })
        await expect(network.getStatus()).resolves.toEqual({ connected: false, type: 'none' })
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('app path hits /network/status', async () => {
        env.isApp.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({
            data: { connected: true, type: 'cellular' },
        })
        await expect(network.getStatus()).resolves.toEqual({ connected: true, type: 'cellular' })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/network/status')
    })
})
