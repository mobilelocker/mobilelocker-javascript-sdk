import { beforeEach, vi } from 'vitest'

/**
 * In-memory localforage for storage / analytics / log tests.
 * Stubs driver APIs used by `src/domains/localforage.ts` at import time.
 */
const memory = new Map<string, unknown>()

function createStoreApi() {
    return {
        getItem: vi.fn(async (key: string) => (memory.has(key) ? memory.get(key) : null)),
        setItem: vi.fn(async (key: string, value: unknown) => {
            memory.set(key, value)
            return value
        }),
        removeItem: vi.fn(async (key: string) => {
            memory.delete(key)
        }),
        clear: vi.fn(async () => {
            memory.clear()
        }),
        keys: vi.fn(async () => [...memory.keys()]),
        length: vi.fn(async () => memory.size),
        iterate: vi.fn(async () => undefined),
        setDriver: vi.fn(async () => undefined),
        config: vi.fn(() => ({})),
        ready: vi.fn(async () => undefined),
        driver: vi.fn(() => 'localStorageWrapper'),
        defineDriver: vi.fn(async () => undefined),
        createInstance: vi.fn(() => createStoreApi()),
        INDEXEDDB: 'asyncStorage',
        WEBSQL: 'webSQLStorage',
        LOCALSTORAGE: 'localStorageWrapper',
    }
}

vi.mock('localforage', () => ({
    default: createStoreApi(),
}))

vi.mock('localforage/src/utils/serializer', () => ({
    default: {
        serialize: (value: unknown, callback: (result: string | null, error?: Error) => void) => {
            try {
                callback(JSON.stringify(value))
            } catch (err) {
                callback(null, err as Error)
            }
        },
        deserialize: (value: string) => JSON.parse(value) as unknown,
    },
}))

beforeEach(() => {
    memory.clear()
})
