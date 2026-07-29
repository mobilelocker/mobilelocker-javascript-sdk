import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { search } = await import('../../src/domains/search')

const emptyResults = {
    presentations: { results: [], total_count: 0 },
    customers: { results: [], total_count: 0 },
    contacts: { results: [], total_count: 0 },
    attendees: { results: [], total_count: 0 },
    business_cards: { results: [], total_count: 0 },
}

describe('search', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('posts query with default limit 5', async () => {
        env.apiClient.post.mockResolvedValue({ data: emptyResults })
        await expect(search.query('Acme')).resolves.toEqual(emptyResults)
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/search', {
            q: 'Acme',
            types: undefined,
            limit: 5,
        })
    })

    it('forwards types and limit', async () => {
        env.apiClient.post.mockResolvedValue({ data: emptyResults })
        await search.query('x', { types: ['customers'], limit: 10 })
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/search', {
            q: 'x',
            types: ['customers'],
            limit: 10,
        })
    })

    it('maps errors', async () => {
        env.apiClient.post.mockRejectedValue(makeAxiosError('offline'))
        await expect(search.query('x')).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})
