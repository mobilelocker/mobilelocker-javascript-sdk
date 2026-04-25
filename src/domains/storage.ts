import { apiClient, getEndpoint, isMobileLocker, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'

export interface StorageEntry {
    /** The key name used to store and retrieve this entry. */
    name: string
    /** The stored value. Can be any JSON-serializable type. */
    data: unknown
    teamID: number
    userID: number
    presentationID: number
    /** ISO 8601 timestamp of when the entry was first created. */
    createdAt: string
    /** ISO 8601 timestamp of the most recent update. */
    updatedAt: string
}

export interface StorageFilter {
    /** Filter entries by name. */
    name?: string
    /** Filter entries by presentation ID. */
    presentationID?: number
    /** Return only entries updated at or after this ISO 8601 timestamp. */
    since?: string
    /** Return only entries updated at or before this ISO 8601 timestamp. */
    until?: string
    /** Maximum number of entries to return. Defaults to `100`. */
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
    /**
     * Get a single storage entry by name for the current presentation and user.
     *
     * @param name - The key name of the entry to retrieve.
     * @returns The matching {@link StorageEntry}, or `null` if not found.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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

    /**
     * Get all storage entries for the current presentation and user.
     *
     * @returns Array of {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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

    /**
     * Get all storage entries for the current user across all presentations.
     *
     * @returns Array of {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getAllForPresentation(): Promise<StorageEntry[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<StorageEntry[]>(getEndpoint('/user/user-storage-entries')),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get all storage entries for a specific presentation by ID.
     *
     * @param presentationID - The numeric ID of the presentation.
     * @returns Array of {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getForPresentation(presentationID: number): Promise<StorageEntry[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<StorageEntry[]>(getEndpoint(`/user/user-storage-entries/presentations/${presentationID}`)),
            )
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Query storage entries with optional filtering.
     *
     * Outside the Mobile Locker app, filters are applied locally against IndexedDB.
     *
     * @param filter - Optional filter by name, presentation, date range, and limit.
     * @returns Array of matching {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * const entries = await mobilelocker.storage.query({ name: 'scan-results', limit: 10 })
     */
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

    /**
     * Full-text search across storage entry names and data.
     *
     * @param text - The search string. Matched against `name` and the stringified `data`.
     * @param filter - Optional pre-filter applied before the text search.
     * @returns Array of matching {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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

    /**
     * Save a value to storage under the given name.
     *
     * Creates a new entry if one does not exist, or updates the existing entry.
     * Outside the Mobile Locker app, persists to IndexedDB via localforage.
     *
     * @param name - The key name for the entry.
     * @param data - Any JSON-serializable value to store.
     * @returns The saved {@link StorageEntry}.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * await mobilelocker.storage.save('scan-results', { leads: [...] })
     */
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

    /**
     * Delete the storage entry with the given name.
     *
     * @param name - The key name of the entry to delete.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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
