import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, pageOf, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { CRMErrorCode, GeneralErrorCode, MobileLockerCRMError } from '../../src/errors'
import type { CRMAccount } from '../../src/types/crm'

const env = createEnvMock({ isMobileLocker: true, isIOS: false })
vi.mock('../../src/env', () => env)

const { crm } = await import('../../src/domains/crm')

const account = (id: string): Pick<CRMAccount, 'id'> => ({ id })

describe('crm list paging (SDK 2.0)', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: true, isIOS: false })
    })

    const entities = [
        { getPage: () => crm.getAccountsPage(10), path: '/crm/accounts' },
        { getPage: () => crm.getAddressesPage(10), path: '/crm/addresses' },
        { getPage: () => crm.getContactsPage(10), path: '/crm/contacts' },
        { getPage: () => crm.getLeadsPage(10), path: '/crm/leads' },
        { getPage: () => crm.getUsersPage(10), path: '/crm/users' },
    ] as const

    it.each(entities.map((e) => [e.path, e]))(
        'get*Page hits %s with cursor envelope params',
        async (_path, entity) => {
            env.apiClient.get.mockResolvedValue({ data: pageOf([account('a')], null) })
            const page = await entity.getPage()
            expect(page.data).toHaveLength(1)
            expect(env.apiClient.get).toHaveBeenCalledWith(`/mobilelocker/api${entity.path}`, {
                params: { limit: 10 },
            })
        },
    )

    it('eachAccountsPage advances via cursor only', async () => {
        env.apiClient.get
            .mockResolvedValueOnce({ data: pageOf([account('1')], 'c1') })
            .mockResolvedValueOnce({ data: pageOf([account('2')], null) })

        const ids: string[] = []
        await crm.eachAccountsPage(5, (chunk) => {
            ids.push(...chunk.map((a) => a.id))
        })
        expect(ids).toEqual(['1', '2'])
        expect(env.apiClient.get).toHaveBeenNthCalledWith(2, '/mobilelocker/api/crm/accounts', {
            params: { limit: 5, cursor: 'c1' },
        })
    })

    it('maps list errors through mapToCRMError (AuthExpired)', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('auth', { status: 401 }))
        await expect(crm.getAccountsPage(10)).rejects.toBeInstanceOf(MobileLockerCRMError)
        await expect(crm.getAccountsPage(10)).rejects.toMatchObject({
            code: CRMErrorCode.AuthExpired,
        })
    })

    it('rejects invalid limits', async () => {
        await expect(crm.getContactsPage(0)).rejects.toMatchObject({
            code: GeneralErrorCode.InvalidArgument,
        })
    })

    it('does not expose removed full-list getters', () => {
        for (const removed of ['getAccounts', 'getAddresses', 'getContacts', 'getLeads', 'getUsers']) {
            expect(crm).not.toHaveProperty(removed)
        }
    })
})

describe('crm entity get / customers / query', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: true, isIOS: false })
    })

    it('getAccount hits by id', async () => {
        env.apiClient.get.mockResolvedValue({ data: account('001') })
        await expect(crm.getAccount('001')).resolves.toEqual(account('001'))
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/crm/accounts/001')
    })

    it('openCustomerPicker requires iOS', async () => {
        await expect(crm.openCustomerPicker()).rejects.toMatchObject({
            code: GeneralErrorCode.UnsupportedEnvironment,
        })
    })

    it('openCustomerPicker returns status booleans on iOS', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({
            data: { status: 'selected', customers: [{ id: 1 }] },
        })
        const result = await crm.openCustomerPicker()
        expect(result.isSelected).toBe(true)
        expect(result.isCancelled).toBe(false)
        expect(result.customers).toEqual([{ id: 1 }])
    })

    it('refresh wraps status with isStarted / isNotConnected', async () => {
        env.apiClient.post.mockResolvedValue({ data: { status: 'started' } })
        const result = await crm.refresh({ mode: 'full' })
        expect(result.isStarted).toBe(true)
        expect(result.isNotConnected).toBe(false)
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/crm/refresh', {
            mode: 'full',
        })
    })

    it('query posts SOQL and parameters', async () => {
        env.apiClient.post.mockResolvedValue({
            data: { rows: [{ Id: '1' }], totalSize: 1, done: true },
        })
        const result = await crm.query('SELECT Id FROM Account WHERE Name = :name', { name: 'Acme' })
        expect(result.totalSize).toBe(1)
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/crm/query', {
            soql: 'SELECT Id FROM Account WHERE Name = :name',
            parameters: { name: 'Acme' },
        })
    })

    it('maps SOQL 400 to SOQLInvalid', async () => {
        env.apiClient.post.mockRejectedValue(
            makeAxiosError('bad', { status: 400, data: { message: 'unexpected token' } }),
        )
        await expect(crm.query('SELECT')).rejects.toMatchObject({
            code: CRMErrorCode.SOQLInvalid,
        })
    })

    it('customer session helpers call expected routes', async () => {
        env.apiClient.get.mockResolvedValue({ data: [] })
        await crm.getCurrentCustomers()
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/crm/customers/current')

        env.apiClient.get.mockResolvedValue({ data: { isCurrent: true } })
        await expect(crm.isCurrentCustomer('x')).resolves.toBe(true)

        env.apiClient.post.mockResolvedValue({})
        await crm.setCurrentCustomers(['a', 'b'])
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/crm/customers/current', {
            customerIDs: ['a', 'b'],
        })

        env.apiClient.put.mockResolvedValue({})
        await crm.addCurrentCustomer('a')
        await crm.removeCurrentCustomer('a')
        env.apiClient.delete.mockResolvedValue({})
        await crm.clearCurrentCustomers()
        expect(env.apiClient.delete).toHaveBeenCalledWith('/mobilelocker/api/crm/customers/current')
    })
})
