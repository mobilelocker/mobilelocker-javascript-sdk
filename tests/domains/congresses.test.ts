import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { GeneralErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { congresses } = await import('../../src/domains/congresses')

describe('congresses', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it.each([
        ['list', () => congresses.list(), '/leadretrieval/events'],
        ['get', () => congresses.get(1), '/leadretrieval/events/1'],
        ['getAttendees', () => congresses.getAttendees(5), '/leadretrieval/events/5/attendees'],
        ['getAttendee', () => congresses.getAttendee('att-9'), '/leadretrieval/attendees/att-9'],
        ['getBusinessCards', () => congresses.getBusinessCards(), '/cards'],
        ['getBusinessCard', () => congresses.getBusinessCard('card-3'), '/cards/card-3'],
    ] as const)('%s hits %s', async (_name, call, path) => {
        env.apiClient.get.mockResolvedValue({ data: path.endsWith('1') ? { id: 1 } : [] })
        await call()
        expect(env.apiClient.get).toHaveBeenCalledWith(`/mobilelocker/api${path}`)
    })

    it('maps network errors', async () => {
        env.apiClient.get.mockRejectedValue(makeAxiosError('offline'))
        await expect(congresses.list()).rejects.toMatchObject({
            code: GeneralErrorCode.NotConnected,
        })
    })
})
