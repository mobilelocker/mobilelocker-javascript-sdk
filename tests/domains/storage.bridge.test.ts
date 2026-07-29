import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { clientStorageEntry, serverStorageEntry } from '../helpers/fixtures'
import { GeneralErrorCode } from '../../src/errors'

/**
 * File-scoped module: first probe of /item is always a 404 so the module-level
 * `_storageItemRouteAvailable` cache settles to "missing route" for this file.
 * Successful /item behavior lives in storage.item-route.test.ts (separate module load).
 */
const env = createEnvMock({ isMobileLocker: true, isIOS: false })
vi.mock('../../src/env', () => env)

const { storage } = await import('../../src/domains/storage')

describe('storage Mobile Locker bridge (no /item route)', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: true, isIOS: false })
    })

    it('get falls back to current-presentation list when /item returns 404, then caches the miss', async () => {
        env.apiClient.get
            .mockRejectedValueOnce(makeAxiosError('missing route', { status: 404 }))
            .mockResolvedValueOnce({
                data: [serverStorageEntry({ name: 'k', data: 1 })],
            })

        await expect(storage.get('k')).resolves.toMatchObject({ name: 'k', data: 1 })
        expect(env.apiClient.get).toHaveBeenNthCalledWith(
            1,
            '/mobilelocker/api/user/user-storage-entries/item',
            { params: { name: 'k' } },
        )
        expect(env.apiClient.get).toHaveBeenNthCalledWith(
            2,
            '/mobilelocker/api/user/user-storage-entries/current-presentation',
        )

        // Cached miss: subsequent gets skip /item entirely.
        env.apiClient.get.mockReset()
        env.apiClient.get.mockResolvedValue({
            data: [serverStorageEntry({ name: 'only-list', data: true })],
        })
        await expect(storage.get('only-list')).resolves.toMatchObject({ name: 'only-list' })
        expect(env.apiClient.get).toHaveBeenCalledTimes(1)
        expect(env.apiClient.get).toHaveBeenCalledWith(
            '/mobilelocker/api/user/user-storage-entries/current-presentation',
        )
    })

    it('getAll maps current-presentation entries to snake_case StorageEntry', async () => {
        env.apiClient.get.mockResolvedValue({
            data: [serverStorageEntry({ name: 'a', data: true })],
        })
        await expect(storage.getAll()).resolves.toEqual([
            clientStorageEntry({ name: 'a', data: true }),
        ])
    })

    it('getAllAcrossPresentations hits unrestricted list endpoint', async () => {
        env.apiClient.get.mockResolvedValue({ data: [] })
        await storage.getAllAcrossPresentations()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user/user-storage-entries')
    })

    it('maps network errors on getAll', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('offline'))
        await expect(storage.getAll()).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})
