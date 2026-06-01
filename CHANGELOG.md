# Changelog

All notable changes to the Mobile Locker JavaScript SDK are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] — 2026-06-01

### Added

- `storage._migrate()` — migrates existing `localStorage` entries into the iOS SQLite-backed store. Called automatically on first storage access when running on iOS; safe to call manually for early initialization or testing.

### Changed

- `storage.save()` on iOS now POSTs directly to the native SQLite route (`POST /mobilelocker/api/user/user-storage-entries`) instead of routing through the capturedata analytics path. This fixes an issue where entries were lost or silently shared between presentations when multiple high-ID presentations were served from the same port (`65535`).
- `storage.save()` on CDN and Electron retains the capturedata analytics path but now retries `get()` up to 3 times with 500ms between each attempt. Previously the immediate read-back could return stale data or `null` before the backend had finished processing the event.
- `storage.delete()` on iOS now calls the capturedata analytics path (for backend audit trail) **and** immediately deletes the local SQLite record (`DELETE /mobilelocker/api/user/user-storage-entries?name=X`), so deleted entries no longer reappear in subsequent `getAll()` calls before the next backend sync.
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
