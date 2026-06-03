// MLJS-15: Native-app-backed localForage instance for iOS 5.3.0+ (Android and Windows when supported).
//
// Registers a custom localForage driver backed by /mobilelocker/api/localstorage routes.
// On supported native app versions the native driver is used, giving port-collision-safe storage.
// On all other environments (CDN, Electron, older iOS, local dev) localForage falls back
// automatically to its native driver stack (IndexedDB → WebSQL → localStorage).

import localforage from 'localforage'
import { isIOS, getEndpoint, apiClient } from '../env'
import { device } from './device'

// localforage/src/utils/serializer has no TypeScript declarations (internal subpath).
// The LocalForageSerializer interface is declared globally by localforage's typings.
// @ts-expect-error — no .d.ts for localforage internal subpath; bundler resolves the JS file
import _serializer from 'localforage/src/utils/serializer'
const serializer = _serializer as LocalForageSerializer

// Wrap the callback-style serialize() in a Promise.
// Blob serialization is async (uses FileReader); all other types resolve synchronously.
function serializeValue(value: unknown): Promise<string | null> {
    if (value === null || value === undefined) return Promise.resolve(null)
    return new Promise((resolve, reject) => {
        serializer.serialize(
            value,
            (result, error) => {
                if (error) reject(error as Error)
                else resolve(result)
            },
        )
    })
}

// Restore the original type from a serialized string (synchronous).
// Falls back to the raw string if deserialization throws (e.g. corrupted entry).
function deserializeValue(raw: string | null | undefined): unknown {
    if (raw === null || raw === undefined) return null
    try {
        return serializer.deserialize(raw)
    } catch {
        return raw
    }
}

// Cache the version check — one /device round-trip per page load, then memoized.
// Consistent with _hasSQLiteRoutes() in storage.ts.
// When Android/Windows support is added, extend this to check the platform + its minimum version.
let _nativeSupportPromise: Promise<boolean> | null = null

function nativeSupport(): Promise<boolean> {
    if (!isIOS()) return Promise.resolve(false)
    if (!_nativeSupportPromise) {
        _nativeSupportPromise = device.isAtLeastVersion('5.3.0').catch(() => false)
    }
    return _nativeSupportPromise
}

// Shape of each entry returned by GET /mobilelocker/api/localstorage
interface LocalStorageEntry {
    key: string
    value: string | null
}

const nativeDriver = {
    _driver: 'mobilelockerNative',
    _support: nativeSupport,

    // No-op: native routes are always available once _support() returns true.
    // The LocalForageDriver typings declare this as void but localForage actually
    // awaits a Promise — both are fine; synchronous return satisfies both.
    _initStorage(_options: LocalForageOptions): void { /* no-op */ },

    async getItem<T>(key: string): Promise<T | null> {
        const { data } = await apiClient.get<{ value: string | null }>(
            getEndpoint('/localstorage/item'),
            { params: { key } },
        )
        return deserializeValue(data.value) as T | null
    },

    async setItem<T>(key: string, value: T): Promise<T> {
        const serialized = await serializeValue(value)
        await apiClient.post(getEndpoint('/localstorage'), { key, value: serialized })
        return value
    },

    async removeItem(key: string): Promise<void> {
        await apiClient.delete(getEndpoint('/localstorage/item'), { params: { key } })
    },

    async clear(): Promise<void> {
        await apiClient.delete(getEndpoint('/localstorage'))
    },

    async length(): Promise<number> {
        const { data } = await apiClient.get<{ length: number }>(getEndpoint('/localstorage/length'))
        return data.length
    },

    async key(n: number): Promise<string> {
        const { data } = await apiClient.get<{ key: string | null }>(
            getEndpoint('/localstorage/key'),
            { params: { index: n } },
        )
        // localForage's own localStorage driver also returns null for out-of-range;
        // the typings say string but null is the documented contract for invalid indices.
        return data.key as string
    },

    async keys(): Promise<string[]> {
        const { data } = await apiClient.get<string[]>(getEndpoint('/localstorage/keys'))
        return data
    },

    // Fetches all entries and iterates in memory. Returning a non-undefined value
    // from iteratorCallback stops iteration early; that value becomes the resolved result.
    async iterate<T, U>(
        iteratorCallback: (value: T, key: string, iterationNumber: number) => U,
    ): Promise<U> {
        const { data } = await apiClient.get<LocalStorageEntry[]>(getEndpoint('/localstorage'))
        let n = 1
        for (const entry of data) {
            const result = iteratorCallback(deserializeValue(entry.value) as T, entry.key, n++)
            if (result !== undefined) return result
        }
        // No early exit — consistent with localForage's own drivers returning undefined here.
        return undefined as unknown as U
    },
}

// Register the native driver globally. defineDriver() stores the driver definition
// synchronously inside its Promise constructor; _support() is checked lazily by
// each instance on first use, so createInstance() below is safe without await.
void localforage.defineDriver(nativeDriver)

/**
 * localForage-compatible data API exposed by `mobilelocker.localforage`.
 *
 * Mirrors the localForage data API exactly, including Promises and optional
 * callback variants. The Settings and Multiple Instances APIs are intentionally
 * omitted — `mobilelocker.localforage` is a single pre-configured store.
 */
export interface MobileLockerLocalForage {
    getItem<T>(key: string, callback?: (err: unknown, value: T | null) => void): Promise<T | null>
    setItem<T>(key: string, value: T, callback?: (err: unknown, value: T) => void): Promise<T>
    removeItem(key: string, callback?: (err: unknown) => void): Promise<void>
    clear(callback?: (err: unknown) => void): Promise<void>
    length(callback?: (err: unknown, numberOfKeys: number) => void): Promise<number>
    key(keyIndex: number, callback?: (err: unknown, key: string) => void): Promise<string>
    keys(callback?: (err: unknown, keys: string[]) => void): Promise<string[]>
    iterate<T, U>(
        iteratee: (value: T, key: string, iterationNumber: number) => U,
        callback?: (err: unknown, result: U) => void,
    ): Promise<U>
}

/**
 * A localForage-compatible key-value store backed by native app storage on
 * iOS 5.3.0+ (Android and Windows when supported).
 *
 * Drop-in replacement for native `localforage` — immune to the port-collision
 * data loss problem in WKWebView. Falls back to IndexedDB on CDN, Electron,
 * older iOS, and local development with no configuration required.
 *
 * All value types supported by localForage are supported here, including
 * `ArrayBuffer`, `Blob`, and typed arrays (serialized as base64 on the native
 * path, with ~33% size overhead vs raw binary storage).
 *
 * @example
 * await mobilelocker.localforage.setItem('user-prefs', { theme: 'dark' })
 * const prefs = await mobilelocker.localforage.getItem('user-prefs')
 */
export const localforageDomain: MobileLockerLocalForage = localforage.createInstance({
    driver: [
        'mobilelockerNative',
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE,
    ],
    name: 'mobilelocker',
    storeName: 'localforage',
})
