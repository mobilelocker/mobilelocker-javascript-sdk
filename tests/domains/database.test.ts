import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import { makeAxiosError } from '../helpers/axios'
import { DatabaseErrorCode } from '../../src/errors'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { database } = await import('../../src/domains/database')

describe('database', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('list returns empty array outside Mobile Locker', async () => {
        await expect(database.list()).resolves.toEqual([])
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('list hits bridge on Mobile Locker', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({ data: { databases: ['a.sqlite'] } })
        await expect(database.list()).resolves.toEqual(['a.sqlite'])
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/database/list')
    })

    it('query on Mobile Locker posts path/sql/parameters', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.post.mockResolvedValue({
            data: { rows: [{ id: 1 }], rows_affected: 0, last_insert_row_id: null },
        })
        const result = await database.query('data.sqlite', 'SELECT * FROM t WHERE id = ?', [1])
        expect(result.rows).toEqual([{ id: 1 }])
        expect(env.apiClient.post).toHaveBeenCalledWith('/mobilelocker/api/database/query', {
            database: 'data.sqlite',
            sql: 'SELECT * FROM t WHERE id = ?',
            parameters: [1],
        })
    })

    it('maps write-not-permitted from host', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.post.mockRejectedValue(
            makeAxiosError('nope', { status: 403, data: { error: 'writes disabled' } }),
        )
        await expect(database.query('x.sqlite', 'DELETE FROM t')).rejects.toMatchObject({
            code: DatabaseErrorCode.WriteNotPermitted,
        })
    })

    it('describe on Mobile Locker uses query params', async () => {
        env.isMobileLocker.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({
            data: { name: 'products', sql: 'CREATE TABLE products', columns: [] },
        })
        await database.describe('data.sqlite', 'products')
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/database/describe', {
            params: { database: 'data.sqlite', table: 'products' },
        })
    })
})
