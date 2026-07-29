import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'

const env = createEnvMock({ isMobileLocker: false, isIOS: false })
vi.mock('../../src/env', () => env)

const { storage } = await import('../../src/domains/storage')

describe('storage local (non-Mobile Locker)', () => {
    beforeEach(() => {
        resetEnvMock(env, { isMobileLocker: false, isIOS: false })
    })

    it('save / get / getAll round-trip with snake_case fields only', async () => {
        const saved = await storage.save('prefs', { theme: 'dark' })
        expect(saved).toMatchObject({
            name: 'prefs',
            data: { theme: 'dark' },
        })
        expect(saved).toEqual(expect.objectContaining({
            team_id: expect.any(Number),
            user_id: expect.any(Number),
            presentation_id: expect.any(Number),
            created_at: expect.any(String),
            updated_at: expect.any(String),
        }))
        // 2.0: no camelCase aliases on StorageEntry
        expect(saved).not.toHaveProperty('teamID')
        expect(saved).not.toHaveProperty('userID')
        expect(saved).not.toHaveProperty('presentationID')

        await expect(storage.get('prefs')).resolves.toMatchObject({
            name: 'prefs',
            data: { theme: 'dark' },
        })
        await expect(storage.get('missing')).resolves.toBeNull()
        await expect(storage.getAll()).resolves.toHaveLength(1)
    })

    it('updates existing entry on second save', async () => {
        await storage.save('k', 1)
        const updated = await storage.save('k', 2)
        expect(updated.data).toBe(2)
        expect(await storage.getAll()).toHaveLength(1)
    })

    it('delete removes entry', async () => {
        await storage.save('temp', true)
        await storage.delete('temp')
        await expect(storage.get('temp')).resolves.toBeNull()
    })

    it('query filters by name and limit', async () => {
        await storage.save('a', 1)
        await storage.save('b', 2)
        expect((await storage.query({ name: 'a' })).map((e) => e.name)).toEqual(['a'])
        expect(await storage.query({ limit: 1 })).toHaveLength(1)
    })

    it('search matches name and stringified data', async () => {
        await storage.save('scan-results', { lead: 'Jane Doe' })
        await storage.save('other', { x: 1 })
        expect((await storage.search('scan'))[0]?.name).toBe('scan-results')
        expect(await storage.search('jane')).toHaveLength(1)
    })

    it('does not expose removed getAllForPresentation', () => {
        expect(storage).not.toHaveProperty('getAllForPresentation')
        expect(storage).toHaveProperty('getAllAcrossPresentations')
        expect(storage).toHaveProperty('getAll')
    })
})
