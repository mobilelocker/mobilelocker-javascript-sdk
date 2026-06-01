import { apiClient, getEndpoint, isMobileLocker, isIOS, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { device } from './device'
import localforage from 'localforage'
import axios from 'axios'

export interface StorageEntry {
    /** The key name used to store and retrieve this entry. */
    name: string
    /** The stored value. Can be any JSON-serializable type. */
    data: unknown
    // snake_case — canonical field names, matching the backend Laravel response
    team_id: number
    user_id: number
    presentation_id: number | null
    /** ISO 8601 timestamp of when the entry was first created. */
    created_at: string | null
    /** ISO 8601 timestamp of the most recent update. */
    updated_at: string | null
    // MLJS-14: camelCase aliases included temporarily for backward compatibility
    // with presentations that used the previous SDK shape. Remove in a future release.
    /** @deprecated Use {@link team_id} */
    teamID?: number
    /** @deprecated Use {@link user_id} */
    userID?: number
    /** @deprecated Use {@link presentation_id} */
    presentationID?: number
    /** @deprecated Use {@link created_at} */
    createdAt?: string
    /** @deprecated Use {@link updated_at} */
    updatedAt?: string
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

// MLJS-14: Internal type for snake_case server responses.
// The iOS server returns snake_case keys; _fromServer() maps them to the
// camelCase StorageEntry interface consumed by SDK callers.
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

// MLJS-14: Stored in localforage (not in the server store) so it is per-origin.
// If the origin changes (e.g. port changes between app versions), migration re-runs
// for the new origin — harmlessly, since there will be no old entries to find there.
const MIGRATION_FLAG_KEY = 'ml_storage_migration_v1'

function toError(err: unknown): MobileLockerError {
    if (err instanceof MobileLockerError) return err
    if (axios.isAxiosError(err) && !err.response) {
        return new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
    }
    return new MobileLockerError(String(err), GeneralErrorCode.ServerError)
}

// MLJS-14: Maps a snake_case server entry to StorageEntry.
// Both snake_case (canonical) and camelCase (deprecated aliases) are populated
// during the transitional period so existing presentations reading either key style continue to work.
function _fromServer(e: ServerEntry): StorageEntry {
    return {
        name: e.name,
        data: e.data,
        // snake_case — canonical
        team_id: e.team_id,
        user_id: e.user_id,
        presentation_id: e.presentation_id,
        created_at: e.created_at,
        updated_at: e.updated_at,
        // camelCase — deprecated aliases
        teamID: e.team_id,
        userID: e.user_id,
        presentationID: e.presentation_id ?? 0,
        createdAt: e.created_at ?? '',
        updatedAt: e.updated_at ?? '',
    }
}

async function _localGet(): Promise<StorageEntry[]> {
    return (await localforage.getItem<StorageEntry[]>(LOCALFORAGE_KEY)) ?? []
}

// MLJS-14: Cached version check — resolved once per page load so every save/delete
// doesn't hit the /device endpoint. Returns true only on iOS 5.2.2+, which introduced
// the SQLite-backed POST/PUT/DELETE routes (MLI-1387).
let _sqliteRoutesAvailablePromise: Promise<boolean> | null = null

function _hasSQLiteRoutes(): Promise<boolean> {
    if (!_sqliteRoutesAvailablePromise) {
        _sqliteRoutesAvailablePromise = device.isAtLeastVersion('5.2.2')
    }
    return _sqliteRoutesAvailablePromise
}

// MLJS-14: Migration state. Module-level so migration runs at most once per page load
// regardless of how many storage calls fire simultaneously on first access.
let _migrationPromise: Promise<void> | null = null

// MLJS-14: Ensures localStorage → SQLite migration has run before any iOS read or write.
// Only applicable on iOS where the port-collision localStorage problem exists.
function _ensureMigrated(): Promise<void> {
    if (!isIOS()) return Promise.resolve()
    if (!_migrationPromise) {
        _migrationPromise = _runMigration()
    }
    return _migrationPromise
}

// MLJS-14: One-time migration of localStorage entries into the iOS SQLite store.
// Reads all entries from localforage, POSTs each to the server, removes them
// from localforage on success, then stores a migration flag so this only runs once.
// Failure is non-fatal — normal storage operations proceed regardless.
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
                await _ensureMigrated()
                const { data } = await withRetry(() =>
                    apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries/current-presentation')),
                )
                return data.map(_fromServer)
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
                apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries')),
            )
            return data.map(_fromServer)
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
                apiClient.get<ServerEntry[]>(getEndpoint(`/user/user-storage-entries/presentations/${presentationID}`)),
            )
            return data.map(_fromServer)
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
                    apiClient.get<ServerEntry[]>(getEndpoint('/user/user-storage-entries'), { params: filter }),
                )
                return data.map(_fromServer)
            }
            let entries = await _localGet()
            if (filter?.name) entries = entries.filter(e => e.name === filter.name)
            if (filter?.since) entries = entries.filter(e => (e.updated_at ?? '') >= filter.since!)
            if (filter?.until) entries = entries.filter(e => (e.updated_at ?? '') <= filter.until!)
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
            if (isIOS()) {
                await _ensureMigrated()
                if (await _hasSQLiteRoutes()) {
                    // MLJS-14: iOS 5.2.2+ — POST directly to the SQLite-backed route.
                    const { data: raw } = await withRetry(() =>
                        apiClient.post<ServerEntry>(getEndpoint('/user/user-storage-entries'), { name, data }),
                    )
                    return _fromServer(raw)
                }
                // Pre-5.2.2 fallback — SQLite routes not available; use capturedata.
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'save', name, { data }, 'capturedata')
                for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const entry = await storage.get(name)
                    if (entry) return entry
                }
                return (await storage.get(name))!
            }
            if (isMobileLocker()) {
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'save', name, { data }, 'capturedata')
                // Retry up to 3 times with 500ms between each attempt, giving the backend
                // time to process the capturedata event before reading back the saved entry.
                const MAX_ATTEMPTS = 3
                for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    const entry = await storage.get(name)
                    if (entry) return entry
                }
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
                entry = { name, data, team_id: 0, user_id: 0, presentation_id: 0, created_at: now, updated_at: now }
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
            if (isIOS()) {
                // MLJS-14: Always post the capturedata event for backend audit trail.
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'delete', name, {}, 'capturedata')
                if (await _hasSQLiteRoutes()) {
                    // iOS 5.2.2+ — also delete the local SQLite record immediately so the
                    // entry is not visible in subsequent getAll() calls before the next sync.
                    await apiClient.delete(getEndpoint('/user/user-storage-entries'), { params: { name } })
                }
                return
            }
            if (isMobileLocker()) {
                const { analytics } = await import('./analytics')
                await analytics._post('user_storage', 'delete', name, {}, 'capturedata')
                return
            }
            const all = await _localGet()
            await localforage.setItem(LOCALFORAGE_KEY, all.filter(e => e.name !== name))
        } catch (err) { throw toError(err) }
    },

    /**
     * @internal
     * Migrates existing localStorage entries into the iOS SQLite store.
     * Called automatically on first storage access when running on iOS.
     * Safe to call manually for testing or early initialization.
     */
    _migrate: _runMigration,
}
