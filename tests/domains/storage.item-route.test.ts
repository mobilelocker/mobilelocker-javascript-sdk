import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { serverStorageEntry } from '../helpers/fixtures'

/**
 * Isolated module load so `_storageItemRouteAvailable` starts null.
 * Do not combine with storage.bridge.test.ts (that file probes 404 first).
 */
const env = createEnvMock({ isMobileLocker: true, isIOS: false })
vi.mock('../../src/env', () => env)

const { storage } = await import('../../src/domains/storage')

describe('storage /item route available', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: true, isIOS: false })
    })

    it('get prefers single-key /item?name= when the host implements it', async () => {
        env.apiClient.get.mockResolvedValue({
            data: serverStorageEntry({ name: 'k', data: { v: 1 } }),
        })

        await expect(storage.get('k')).resolves.toMatchObject({
            name: 'k',
            data: { v: 1 },
            team_id: 1,
        })
        expect(env.apiClient.get).toHaveBeenCalledWith(
            '/mobilelocker/api/user/user-storage-entries/item',
            { params: { name: 'k' } },
        )
        expect(env.apiClient.get).toHaveBeenCalledTimes(1)
    })
})
