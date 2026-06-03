# Changelog

All notable changes to the Mobile Locker JavaScript SDK are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-06-01

### Added

- `mobilelocker.localforage` — a localForage-compatible key-value store backed by native app storage on iOS 5.3.0+ (Android and Windows when supported). Drop-in replacement for native `localforage` that is immune to the port-collision data loss problem in WKWebView. On iOS 5.3.0+ reads and writes go through the `/mobilelocker/api/localstorage` routes introduced in MLI-1392; on all other environments (CDN, Electron, older iOS, local development) localForage falls back automatically to IndexedDB. All value types supported by localForage are supported, including `ArrayBuffer`, `Blob`, and typed arrays (binary types are base64-encoded for transport, with ~33% size overhead on the native path). The global `localforage` instance is untouched — migration is opt-in.
- `MobileLockerLocalForage` TypeScript type — the interface exposed by `mobilelocker.localforage`, mirroring the localForage data API (`getItem`, `setItem`, `removeItem`, `clear`, `length`, `key`, `keys`, `iterate`).
- `storage._migrate()` — migrates existing `localStorage` entries into the iOS SQLite-backed store. Called automatically on first storage access when running on iOS; safe to call manually for early initialization or testing.

### Changed

- On Mobile Locker iOS 5.3.0+, `window.localStorage` is transparently replaced by a database-backed storage engine. All `localStorage` reads and writes in existing presentations are automatically routed through the same SQLite store that backs `mobilelocker.localforage`, making them immune to the port-collision data loss problem (MLI-1387/MLI-1388). No code changes are required — the swap happens at the native layer before any page JavaScript runs. Any `localStorage` entries written by older app versions are migrated to the new store automatically on first load and removed from native `localStorage` on success.
- `storage.save()` on Mobile Locker app 5.3.0+ now POSTs directly to the native SQLite route (`POST /mobilelocker/api/user/user-storage-entries`) instead of routing through the capturedata analytics path. This fixes an issue where entries were lost or silently shared between presentations when multiple high-ID presentations were served from the same port (`65535`). On Mobile Locker app 5.2.1 and earlier, the capturedata path is used automatically as a fallback.
- `storage.save()` on CDN and Electron retains the capturedata analytics path but now retries `get()` up to 3 times with 500ms between each attempt. Previously the immediate read-back could return stale data or `null` before the backend had finished processing the event.
- `storage.delete()` on Mobile Locker app 5.3.0+ calls the capturedata analytics path (for backend audit trail) **and** immediately deletes the local SQLite record (`DELETE /mobilelocker/api/user/user-storage-entries?name=X`), so deleted entries no longer reappear in subsequent `getAll()` calls before the next backend sync. On Mobile Locker app 5.2.1 and earlier, only the capturedata path fires.
- `storage._migrate()` only runs on Mobile Locker app 5.3.0+. On earlier versions it is a no-op, preserving existing localStorage behaviour.
- `StorageEntry` fields now use snake_case as the canonical wire format, matching the Laravel backend and iOS `toJSON()` output: `team_id`, `user_id`, `presentation_id`, `created_at`, `updated_at`.
- All server responses in the `storage` domain are mapped through a new internal `_fromServer()` function.

### Deprecated

- `StorageEntry.teamID` — use `team_id`
- `StorageEntry.userID` — use `user_id`
- `StorageEntry.presentationID` — use `presentation_id`
- `StorageEntry.createdAt` — use `created_at`
- `StorageEntry.updatedAt` — use `updated_at`

Both camelCase and snake_case keys are present on all `StorageEntry` objects returned by the server during this transitional period. The camelCase aliases will be removed in a future minor release.

---

## [1.0.1] — prior release

See git history for changes prior to 1.1.0.
