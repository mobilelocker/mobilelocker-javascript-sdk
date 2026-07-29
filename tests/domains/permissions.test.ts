import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { permissions } = await import('../../src/domains/permissions')

describe('permissions', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('returns not_determined / unavailable outside iOS without calling API', async () => {
        await expect(permissions.camera()).resolves.toEqual({
            status: 'not_determined',
            granted: false,
        })
        await expect(permissions.biometric()).resolves.toEqual({
            available: false,
            biometric_type: 'unknown',
            error: null,
        })
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('fetches permission routes on iOS', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({
            data: { status: 'authorized', granted: true },
        })
        await expect(permissions.microphone()).resolves.toEqual({
            status: 'authorized',
            granted: true,
        })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/permissions/microphone')
    })
})
