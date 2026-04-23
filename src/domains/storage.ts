import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

export interface StorageEntry {
    name: string
    data: unknown
    teamID: number
    userID: number
    presentationID: number
    createdAt: string
    updatedAt: string
}

export interface StorageFilter {
    name?: string
    presentationID?: number
    since?: string
    until?: string
    limit?: number
}

const LOCALFORAGE_KEY = 'user_storage'

function toError(err: unknown): MobileLockerError {
    if (err instanceof MobileLockerError) return err
    if (axios.isAxiosError(err) && !err.response) {
        return new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
    }
    return new MobileLockerError(String(err), GeneralErrorCode.ServerError)
}

async function _localGet(): Promise<StorageEntry[]> {
    return (await localforage.getItem<StorageEntry[]>(LOCALFORAGE_KEY)) ?? []
}

export const storage = {
    async get(name: string): Promise<StorageEntry | null> {
        try {
            if (isMobileLocker()) {
                const entries = await storage.getAll()
                return entries.find(e => e.name === name) ?? null
            }
            const all = await _localGet()
            return all.find(e => e.name === name) ?? null
        } catch (err) { throw toError(err) }
    },

    async getAll(): Promise<StorageEntry[]> {
        try {
            if (isMobileLocker()) {
                const { data } = await withRetry(() =>
                    apiClient.get<StorageEntry[]>(getEndpoint('/user/user-storage-entries/current-presentation')),
                )
                return data
            }
            return _localGet()
        } catch (err) { throw toError(err) }
    },

    async getAllForPresentation(): Promise<StorageEntry[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<StorageEntry[]>(getEndpoint('/user/user-storage-entries')),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    async getForPresentation(presentationID: number): Promise<StorageEntry[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<StorageEntry[]>(getEndpoint(`/user/user-storage-entries/presentations/${presentationID}`)),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    async query(filter?: StorageFilter): Promise<StorageEntry[]> {
        try {
            if (isMobileLocker()) {
                const { data } = await withRetry(() =>
                    apiClient.get<StorageEntry[]>(getEndpoint('/user/user-storage-entries'), { params: filter }),
                )
                return data
            }
            let entries = await _localGet()
            if (filter?.name) entries = entries.filter(e => e.name === filter.name)
            if (filter?.since) entries = entries.filter(e => e.updatedAt >= filter.since!)
            if (filter?.until) entries = entries.filter(e => e.updatedAt <= filter.until!)
            return entries.slice(0, filter?.limit ?? 100)
        } catch (err) { throw toError(err) }
    },

    async search(text: string, filter?: StorageFilter): Promise<StorageEntry[]> {
        try {
            if (isMobileLocker()) {
                const { data } = await withRetry(() =>
                    apiClient.get<StorageEntry[]>(getEndpoint('/user/user-storage-entries/search'), {
                        params: { q: text, ...filter },
                    }),
                )
                return data
            }
            const entries = await storage.query(filter)
            const lower = text.toLowerCase()
            return entries.filter(e =>
                e.name.toLowerCase().includes(lower) ||
                JSON.stringify(e.data).toLowerCase().includes(lower),
            )
        } catch (err) { throw toError(err) }
    },

    async save(name: string, data: unknown): Promise<StorageEntry> {
        try {
            if (isMobileLocker()) {
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'save', name, { uuid: uuidv4(), data }, 'capturedata')
                return (await storage.get(name))!
            }
            const all = await _localGet()
            const now = new Date().toISOString()
            const idx = all.findIndex(e => e.name === name)
            let entry: StorageEntry
            if (idx !== -1) {
                all[idx] = { ...all[idx], data, updatedAt: now }
                entry = all[idx]
            } else {
                entry = { name, data, teamID: 0, userID: 0, presentationID: 0, createdAt: now, updatedAt: now }
                all.push(entry)
            }
            await localforage.setItem(LOCALFORAGE_KEY, all)
            return entry
        } catch (err) { throw toError(err) }
    },

    async delete(name: string): Promise<void> {
        try {
            if (isMobileLocker()) {
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'delete', name, {}, 'capturedata')
                return
            }
            const all = await _localGet()
            await localforage.setItem(LOCALFORAGE_KEY, all.filter(e => e.name !== name))
        } catch (err) { throw toError(err) }
    },
}
