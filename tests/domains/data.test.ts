import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { analyticsMock, resetAnalyticsMock } from '../helpers/analytics-mock'
import { makeAxiosError } from '../helpers/axios'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)
vi.mock('../../src/domains/analytics', () => ({
    analytics: analyticsMock,
    getLocalforageEvents: analyticsMock.getLocalforageEvents,
}))

const { data } = await import('../../src/domains/data')

describe('data', () => {
    beforeEach(() => {
        resetEnvMock(env)
        resetAnalyticsMock()
    })

    it('submitForm posts capturedata analytics event', () => {
        data.submitForm('lead-form', { email: 'a@b.com' })
        expect(analyticsMock.logEvent).toHaveBeenCalledWith(
            'data-capture',
            'lead-form',
            'lead-form',
            { email: 'a@b.com' },
            'capturedata',
        )
    })

    it.each([
        ['getProducts', () => data.getProducts(), '/products'],
        ['getProduct', () => data.getProduct(1), '/products/1'],
        ['getLabels', () => data.getLabels(), '/labels'],
        ['getLabel', () => data.getLabel(2), '/labels/2'],
        ['getFolders', () => data.getFolders(), '/folders'],
        ['getFolder', () => data.getFolder(3), '/folders/3'],
        ['getCustomers', () => data.getCustomers(), '/customers'],
        ['getCustomer', () => data.getCustomer('001ABC'), '/customers/001ABC'],
    ] as const)('%s hits %s', async (_name, call, path) => {
        env.apiClient.get.mockResolvedValue({ data: [] })
        await call()
        expect(env.apiClient.get).toHaveBeenCalledWith(`/mobilelocker/api${path}`)
    })

    it('maps errors on getProducts', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('offline'))
        await expect(data.getProducts()).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})
