import axios from 'axios'
import localforage from 'localforage'
import { apiClient, getEndpoint, isMobileLocker, isIOS, withRetry } from '../env'
import { mapToMobileLockerError } from '../errors'
import { analytics } from './analytics'
import { device } from './device'

export interface StorageEntry {
    /** The key name used to store and retrieve this entry. */
    name: string
    /** The stored value. Can be any JSON-serializable type. */
    data: unknown
    team_id: number
    user_id: number
    presentation_id: number | null
    /** ISO 8601 timestamp of when the entry was first created. */
    created_at: string | null
    /** ISO 8601 timestamp of the most recent update. */
    updated_at: string | null
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

// Internal type for snake_case server responses.
interface ServerEntry {
    uuid: string
    id: number
    team_id: number
    user_id: number
    presentation_id: number | null
    name: string
    data: unknown
    created_at: string | null
    updated_at: string | null
}

const LOCALFORAGE_KEY = 'user_storage'
const MAX_ATTEMPTS = 3

// Stored in localforage (not in the server store) so it is per-origin.
// If the origin changes (e.g. port changes between app versions), migration re-runs
// for the new origin — harmlessly, since there will be no old entries to find there.
const MIGRATION_FLAG_KEY = 'ml_storage_migration_v1'

function _fromServer(e: ServerEntry): StorageEntry {
    return {
        name: e.name,
        data: e.data,
        team_id: e.team_id,
        user_id: e.user_id,
        presentation_id: e.presentation_id,
        created_at: e.created_at,
        updated_at: e.updated_at,
    }
}

async function _localGet(): Promise<StorageEntry[]> {
    return (await localforage.getItem<StorageEntry[]>(LOCALFORAGE_KEY)) ?? []
}

// Cached version check — resolved once per page load so every save/delete
// doesn't hit the /device endpoint. Returns true only on iOS 5.3.0+, which introduced
// the SQLite-backed POST/PUT/DELETE routes (MLI-1387).
let _sqliteRoutesAvailablePromise: Promise<boolean> | null = null

function _hasSQLiteRoutes(): Promise<boolean> {
    if (!_sqliteRoutesAvailablePromise) {
        // .catch(() => false) ensures that if /device doesn't exist on very old app
        // versions, we fall back to capturedata rather than throwing.
        _sqliteRoutesAvailablePromise = device.isAtLeastVersion('5.3.0').catch(() => false)
    }
    return _sqliteRoutesAvailablePromise
}

// Migration state. Module-level so migration runs at most once per page load
// regardless of how many storage calls fire simultaneously on first access.
let _migrationPromise: Promise<void> | null = null

// Ensures localStorage → SQLite migration has run before any iOS read or write.
// Only applicable on iOS where the port-collision localStorage problem exists.
function _ensureMigrated(): Promise<void> {
    if (!isIOS()) return Promise.resolve()
    if (!_migrationPromise) {
        _migrationPromise = _runMigration()
    }
    return _migrationPromise
}

// Shared capturedata save path used by pre-5.3.0 iOS and CDN/Electron.
// Posts the event then retries get() until the backend has processed it.
async function _saveViaCapturedata(name: string, data: unknown): Promise<StorageEntry> {
    await analytics._post('user_storage', 'save', name, { data }, 'capturedata')
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const entry = await storage.get(name)
        if (entry) return entry
    }
    return (await storage.get(name))!
}

async function _runMigration(): Promise<void> {
    try {
        if (!await _hasSQLiteRoutes()) return
        const alreadyMigrated = await localforage.getItem<boolean>(MIGRATION_FLAG_KEY)
        if (alreadyMigrated) return

        const local = await _localGet()
        for (const entry of local) {
            try {
                await apiClient.post(getEndpoint('/user/user-storage-entries'), {
                    name: entry.name,
                    data: entry.data,
                })
                // Remove migrated entry from localforage immediately on success
                // so a partial migration doesn't re-migrate already-moved entries.
                const remaining = await _localGet()
                await localforage.setItem(LOCALFORAGE_KEY, remaining.filter(e => e.name !== entry.name))
            } catch {
                // Skip entries that fail (e.g. offline) — don't block migration of others.
                // On the next page load, migration will re-run and retry any that were skipped.
            }
        }

        await localforage.setItem(MIGRATION_FLAG_KEY, true)
    } catch {
        // Non-fatal — normal storage operations proceed regardless.
    }
}

// Hosts that implement GET …/item?name= must return HTTP 200 with a JSON body of
// either the entry object or `null` (missing key). A 404 means the route is absent
// (older apps) — we fall back to listing current-presentation entries once, then
// cache that the item route is unavailable for the rest of the page load.
let _storageItemRouteAvailable: boolean | null = null

/**
 * Single-entry read: prefer GET …/item?name= (MLJS-25).
 * Falls back to listing the current presentation when the host lacks /item.
 */
async function _getByNameFromServer(name: string): Promise<StorageEntry | null> {
    if (_storageItemRouteAvailable !== false) {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<ServerEntry | null>(getEndpoint('/user/user-storage-entries/item'), {
                    params: { name },
                }),
            )
            _storageItemRouteAvailable = true
            return data ? _fromServer(data) : null
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 404 && _storageItemRouteAvailable !== true) {
                _storageItemRouteAvailable = false
            } else {
                throw err
            }
        }
    }

    const { data } = await withRetry(() =>
        apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries/current-presentation')),
    )
    const match = data.find(e => e.name === name)
    return match ? _fromServer(match) : null
}

/** @category Storage */
export const storage = {
    /**
     * Get a single storage entry by name for the current presentation and user.
     *
     * On Mobile Locker app hosts that implement
     * `GET /user/user-storage-entries/item?name=`, this is a single-key read.
     * Older hosts fall back to listing current-presentation entries.
     *
     * @param name - The key name of the entry to retrieve.
     * @returns The matching {@link StorageEntry}, or `null` if not found.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async get(name: string): Promise<StorageEntry | null> {
        try {
            if (isMobileLocker()) {
                await _ensureMigrated()
                return await _getByNameFromServer(name)
            }
            const all = await _localGet()
            return all.find(e => e.name === name) ?? null
        } catch (err) { throw mapToMobileLockerError(err) }
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
                await _ensureMigrated()
                const { data } = await withRetry(() =>
                    apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries/current-presentation')),
                )
                return data.map(_fromServer)
            }
            return _localGet()
        } catch (err) { throw mapToMobileLockerError(err) }
    },

    /**
     * Get all storage entries for the current user across every presentation.
     *
     * @remarks Previously misnamed `getAllForPresentation` (that name hit this same
     * unrestricted list endpoint). Use {@link getAll} for the current presentation only.
     *
     * @returns Array of {@link StorageEntry} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getAllAcrossPresentations(): Promise<StorageEntry[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries')),
            )
            return data.map(_fromServer)
        } catch (err) { throw mapToMobileLockerError(err) }
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
                apiClient.get<ServerEntry[]>(getEndpoint(`/user/user-storage-entries/presentations/${presentationID}`)),
            )
            return data.map(_fromServer)
        } catch (err) { throw mapToMobileLockerError(err) }
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
                    apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries'), { params: filter }),
                )
                return data.map(_fromServer)
            }
            let entries = await _localGet()
            if (filter?.name) entries = entries.filter(e => e.name === filter.name)
            if (filter?.since) entries = entries.filter(e => (e.updated_at ?? '') >= filter.since!)
            if (filter?.until) entries = entries.filter(e => (e.updated_at ?? '') <= filter.until!)
            return entries.slice(0, filter?.limit ?? 100)
        } catch (err) { throw mapToMobileLockerError(err) }
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
                    apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries/search'), {
                        params: { q: text, ...filter },
                    }),
                )
                return data.map(_fromServer)
            }
            const entries = await storage.query(filter)
            const lower = text.toLowerCase()
            return entries.filter(e =>
                e.name.toLowerCase().includes(lower) ||
                JSON.stringify(e.data).toLowerCase().includes(lower),
            )
        } catch (err) { throw mapToMobileLockerError(err) }
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
            if (isIOS()) {
                await _ensureMigrated()
                if (await _hasSQLiteRoutes()) {
                    // iOS 5.3.0+ — POST directly to the SQLite-backed route.
                    const { data: raw } = await withRetry(() =>
                        apiClient.post<ServerEntry>(getEndpoint('/user/user-storage-entries'), { name, data }),
                    )
                    return _fromServer(raw)
                }
                // Pre-5.3.0 fallback — SQLite routes not available; use capturedata.
                return _saveViaCapturedata(name, data)
            }
            if (isMobileLocker()) {
                return _saveViaCapturedata(name, data)
            }
            const all = await _localGet()
            const now = new Date().toISOString()
            const idx = all.findIndex(e => e.name === name)
            let entry: StorageEntry
            if (idx !== -1) {
                all[idx] = { ...all[idx], data, updated_at: now }
                entry = all[idx]
            } else {
                entry = { name, data, team_id: 0, user_id: 0, presentation_id: 0, created_at: now, updated_at: now }
                all.push(entry)
            }
            await localforage.setItem(LOCALFORAGE_KEY, all)
            return entry
        } catch (err) { throw mapToMobileLockerError(err) }
    },

    /**
     * Delete the storage entry with the given name.
     *
     * @param name - The key name of the entry to delete.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async delete(name: string): Promise<void> {
        try {
            if (isIOS()) {
                // Always post the capturedata event for backend audit trail.
                await analytics._post('user_storage', 'delete', name, {}, 'capturedata')
                if (await _hasSQLiteRoutes()) {
                    // iOS 5.3.0+ — also delete the local SQLite record immediately so the
                    // entry is not visible in subsequent getAll() calls before the next sync.
                    await apiClient.delete(getEndpoint('/user/user-storage-entries'), { params: { name } })
                }
                return
            }
            if (isMobileLocker()) {
                await analytics._post('user_storage', 'delete', name, {}, 'capturedata')
                return
            }
            const all = await _localGet()
            await localforage.setItem(LOCALFORAGE_KEY, all.filter(e => e.name !== name))
        } catch (err) { throw mapToMobileLockerError(err) }
    },

    /**
     * @internal
     * Migrates existing localStorage entries into the iOS SQLite store.
     * Called automatically on first storage access when running on iOS.
     * Safe to call manually for testing or early initialization.
     */
    _migrate: _runMigration,
}
