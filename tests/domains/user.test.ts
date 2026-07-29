import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { user } = await import('../../src/domains/user')

describe('user', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('get returns user payload', async () => {
        env.apiClient.get.mockResolvedValue({ data: { id: 1, name: 'Pat' } })
        await expect(user.get()).resolves.toEqual({ id: 1, name: 'Pat' })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user')
    })

    it('maps failures to MobileLockerError', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('offline'))
        await expect(user.get()).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})
