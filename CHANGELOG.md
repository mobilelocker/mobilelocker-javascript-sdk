# Changelog

All notable changes to the Mobile Locker JavaScript SDK are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [2.0.0] — Unreleased

Major release in progress (not published yet). Breaking changes below (MLJS-24, MLJS-25, MLJS-26, MLJS-27).

Host list contract for contacts + CRM (iOS **5.5.0+**, [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)):

```
GET …?limit={1…5000}&cursor={token?}
→ { data, meta: { cursor: { next: string | null, count: number } } }
```

Walks stop when `meta.cursor.next === null`. Intermediate `min` / `after` + bare-array list shapes from early MLI-1717 notes are **not** used.

### Added

- **`Page<T>` / `PageMeta` / `PageCursor`** — shared cursor-envelope types for list APIs.
- **Contacts cursor paging** (MLJS-27 / [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)) — requires **Mobile Locker iOS 5.5.0+**.
  - `contacts.getPage(limit, cursor?)` → `Page<UserContact>`
  - `contacts.eachPage(pageSize, handler)` — advances only via `meta.cursor.next`
- **CRM list paging** (MLJS-26 / [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)) — same envelope for offline CRM tables. Prefer filtered SOQL via `crm.query` when possible.

  | Entity    | One page                              | Full walk                         |
  |-----------|---------------------------------------|-----------------------------------|
  | Accounts  | `crm.getAccountsPage(limit, cursor?)` | `crm.eachAccountsPage(pageSize, handler)` |
  | Addresses | `crm.getAddressesPage(limit, cursor?)` | `crm.eachAddressesPage(pageSize, handler)` |
  | Contacts  | `crm.getContactsPage(limit, cursor?)` | `crm.eachContactsPage(pageSize, handler)` |
  | Leads     | `crm.getLeadsPage(limit, cursor?)`    | `crm.eachLeadsPage(pageSize, handler)` |
  | Users     | `crm.getUsersPage(limit, cursor?)`    | `crm.eachUsersPage(pageSize, handler)` |

  `limit` / `pageSize` must be integers **1…5000** (else `InvalidArgument`). Host: `GET /mobilelocker/api/{user-contacts|crm/{entity}}?limit=&cursor=`.
- **`storage.getAllAcrossPresentations()`** (MLJS-25) — correctly named replacement for the misnamed full-user list API (see Removed).
- **Typed CRM models** (MLJS-25) — `CRMAccount`, `CRMAddress`, `CRMContact`, `CRMLead`, `CRMUser` replace `unknown` on CRM list/get helpers (shapes match iOS `toJSON()`).
- **`isAndroid()`** (MLJS-25) — exported on the public API next to `isIOS` / `isElectron`.
- **General error codes** (MLJS-25) — `InvalidArgument`, `UnsupportedEnvironment`, `NotFound`.
- Domain errors now **extend `MobileLockerError`** so `instanceof MobileLockerError` matches CRM / database / HTTP failures.
- Shared error mappers: `mapToMobileLockerError`, `mapToCRMError`, `mapToDatabaseError`.
- Package `exports` now includes a `types` condition pointing at `dist/index.d.ts`.
- **`storage.get(name)`** prefers `GET /user/user-storage-entries/item?name=` (single-key host route; iOS MLJS-25) and falls back to listing current-presentation entries on older hosts.

### Changed

- Validation and platform-gate failures use `InvalidArgument` / `UnsupportedEnvironment` instead of `ServerError`.
- Presentation not-found paths use `NotFound`.
- `SDKLogDomain` includes `http`, `network`, `permissions`, and `localforage`.

### Removed

- **`contacts.getAll()`** (MLJS-24 / [MLI-1708](https://mobilelocker.atlassian.net/browse/MLI-1708)) — **breaking.** Loading the entire address book in one call is unsafe for production users with 100k+ contacts (memory spike, presentation stall).
- **`contacts.getChunked(minID, limit)`** (MLJS-27) — **breaking.** Superseded by `contacts.getPage` / `eachPage` against the MLI-1718 cursor envelope. No public `min` query param.

  ```js
  // Before
  const contacts = await mobilelocker.contacts.getAll()
  // or: await mobilelocker.contacts.getChunked(minID, 500)

  // After — process pages; do not push(...chunk) into one array (iOS 5.5.0+)
  await mobilelocker.contacts.eachPage(500, (chunk) => {
      for (const contact of chunk) {
          // handle one contact
      }
  })

  // Single page
  const page = await mobilelocker.contacts.getPage(500)
  const next = page.meta.cursor.next
      ? await mobilelocker.contacts.getPage(500, page.meta.cursor.next)
      : null
  ```

  Native hosts remove the unbound full-dump and intermediate `min`/`after` bare-array branches of list routes after presentations adopt this release.

- **`crm.getAccounts()` / `getAddresses()` / `getContacts()` / `getLeads()` / `getUsers()`** (MLJS-26 / [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)) — **breaking.** Full-table CRM list loads are unsafe for large offline sets (same class of memory risk as the old contacts dump). Single-id getters (`getAccount`, etc.) and `crm.query` are unchanged.

  ```js
  // Before
  const accounts = await mobilelocker.crm.getAccounts()

  // After — prefer SOQL when filtering
  const { rows } = await mobilelocker.crm.query(
      'SELECT Id, Name FROM Account WHERE Name = :name',
      { name: 'Acme' },
  )

  // After — offline walk (iOS 5.5.0+); process pages; do not rebuild one array
  await mobilelocker.crm.eachAccountsPage(500, (chunk) => {
      for (const account of chunk) {
          // handle one account
      }
  })

  // Single page when you already know limit + optional cursor
  const page = await mobilelocker.crm.getAccountsPage(500)
  const next = page.meta.cursor.next
      ? await mobilelocker.crm.getAccountsPage(500, page.meta.cursor.next)
      : null
  ```

  Minimum host for CRM / contacts list walks: **iOS 5.5.0**. There is no unbounded fallback on older hosts.

- **`storage.getAllForPresentation()`** (MLJS-25) — **breaking rename.** That method hit the unrestricted user storage list (all presentations), not “for the current presentation.” Use:
  - `storage.getAll()` — current presentation
  - `storage.getAllAcrossPresentations()` — all presentations for the user
  - `storage.getForPresentation(id)` — one presentation by id

- **`StorageEntry` camelCase aliases** (MLJS-25) — **breaking.** `teamID`, `userID`, `presentationID`, `createdAt`, `updatedAt` removed. Use snake_case only: `team_id`, `user_id`, `presentation_id`, `created_at`, `updated_at`.

---

## [1.1.0] — 2026-06-01

### Added

- `mobilelocker.localforage` — a localForage-compatible key-value store backed by native app storage on iOS 5.3.0+ (Android and Windows when supported). Drop-in replacement for native `localforage` that is immune to the port-collision data loss problem in WKWebView. On iOS 5.3.0+ reads and writes go through the `/mobilelocker/api/localstorage` routes introduced in MLI-1392; on all other environments (CDN, Electron, older iOS, local development) localForage falls back automatically to IndexedDB. All value types supported by localForage are supported, including `ArrayBuffer`, `Blob`, and typed arrays (binary types are base64-encoded for transport, with ~33% size overhead on the native path). The global `localforage` instance is untouched — migration is opt-in. On first use, any existing data written by native `localforage` (IndexedDB) is automatically migrated to the native store so presentations switching to `mobilelocker.localforage` do not lose previously saved data.
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
