import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, pageOf, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { GeneralErrorCode, MobileLockerError } from '../../src/errors'

const env = createEnvMock({ isMobileLocker: true })
vi.mock('../../src/env', () => env)

const { contacts } = await import('../../src/domains/contacts')

describe('contacts (SDK 2.0 cursor paging)', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: true })
    })

    it('getPage requests /user-contacts with limit and optional cursor', async () => {
        env.apiClient.get.mockResolvedValue({
            data: pageOf([{ id: 1, name: 'Ada' }], 'cur-2'),
        })

        const page = await contacts.getPage(500)
        expect(page.meta.cursor).toEqual({ next: 'cur-2', count: 1 })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user-contacts', {
            params: { limit: 500 },
        })

        env.apiClient.get.mockResolvedValue({ data: pageOf([], null) })
        await contacts.getPage(500, 'cur-2')
        expect(env.apiClient.get).toHaveBeenLastCalledWith('/mobilelocker/api/user-contacts', {
            params: { limit: 500, cursor: 'cur-2' },
        })
    })

    it('eachPage walks until next is null', async () => {
        env.apiClient.get
            .mockResolvedValueOnce({ data: pageOf([{ id: 1 }], 'n1') })
            .mockResolvedValueOnce({ data: pageOf([{ id: 2 }], null) })

        const ids: number[] = []
        await contacts.eachPage(100, (chunk) => {
            ids.push(...chunk.map((c) => c.id))
        })

        expect(ids).toEqual([1, 2])
        expect(env.apiClient.get).toHaveBeenCalledTimes(2)
    })

    it('rejects out-of-range page sizes with InvalidArgument', async () => {
        await expect(contacts.getPage(0)).rejects.toMatchObject({
            code: GeneralErrorCode.InvalidArgument,
        })
        await expect(contacts.eachPage(5001, () => undefined)).rejects.toMatchObject({
            code: GeneralErrorCode.InvalidArgument,
        })
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('get maps network errors via mapToMobileLockerError', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('Network Error'))
        await expect(contacts.get(42)).rejects.toBeInstanceOf(MobileLockerError)
        await expect(contacts.get(42)).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })

    it('get hits single-contact endpoint', async () => {
        env.apiClient.get.mockResolvedValue({ data: { id: 9, name: 'Grace' } })
        await expect(contacts.get(9)).resolves.toMatchObject({ id: 9 })
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/user-contacts/9')
    })

    it('does not expose removed 1.x full-list APIs', () => {
        expect(contacts).not.toHaveProperty('getAll')
        expect(contacts).not.toHaveProperty('getChunked')
    })
})
