# Mobile Locker JavaScript SDK

The official JavaScript SDK for building interactive presentations and custom features on the Mobile Locker platform.

## Overview

This SDK gives IVA developers programmatic access to the Mobile Locker platform from within a presentation — including user data, CRM records, analytics, device capabilities, storage, and more.

The SDK works in these environments:

| Environment      | Description                                                                     |
|------------------|---------------------------------------------------------------------------------|
| **iOS/iPadOS**   | Running inside the Mobile Locker iOS app (`isIOS() === true`)                   |
| **Android**      | Running inside the Mobile Locker Android app (`isAndroid() === true`)           |
| **Windows**      | Running inside the Mobile Locker Windows app (`isWindows() === true`)           |
| **CDN**          | Loaded as part of a CDN-hosted presentation (`isCDN() === true`)                |

When running outside of a Mobile Locker environment (e.g. local development), most SDK calls are silently no-ops or return sensible local fallbacks so you can develop without a live host.

---

## ⚠️ SDK 2.0 hard break — action required

**SDK 2.0 is a deliberate hard break.** There is **no** dual-mode, **no** grace period, and **no** silent fallback that still dumps full contact or CRM tables.

**Mobile Locker iOS 5.5.0 is shipping soon** and will be in the wild with matching host changes. Presentations still on SDK **1.x** APIs (or still calling removed full-list methods) will **break or fail** on 5.5.0 devices.

### What you must do

1. **Upgrade the package to `@mobilelocker/javascript-sdk` 2.0** (see [Installation](#installation)).
2. **Search your presentation JS** for removed APIs and rewrite to the new contracts (checklist below).
3. **Test on Mobile Locker iOS 5.5.0+** before relying on production fleets that receive the app update.

| Removed / changed (1.x → 2.0) | Use instead |
|-------------------------------|-------------|
| `contacts.getAll()` | `contacts.eachPage(pageSize, handler)` or `contacts.getPage(limit, cursor?)` |
| `contacts.getChunked(minID, limit)` | `contacts.getPage(limit, cursor?)` — response is a **cursor envelope**, not a bare array |
| `crm.getAccounts()` / `getAddresses()` / `getContacts()` / `getLeads()` / `getUsers()` | Prefer `crm.query` (SOQL). Offline walk: `crm.eachAccountsPage` (etc.) or `crm.getAccountsPage` |
| Advancing pages via `min` / `after` / last row `id` heuristics | Advance **only** with `page.meta.cursor.next` until it is `null` |
| `storage.getAllForPresentation()` | `storage.getAll()` (current presentation) or `storage.getAllAcrossPresentations()` |
| `StorageEntry` camelCase aliases (`teamID`, …) | Snake_case only (`team_id`, …) |

**Host list contract (iOS 5.5.0+):**

```
GET …?limit=1…5000&cursor=
→ { data, meta: { cursor: { next, count } } }
```

Do **not** reassemble every page into one in-memory array for large address books or CRM tables. Process each page in the handler.

Full detail: [CHANGELOG 2.0.0](./CHANGELOG.md#200--unreleased).

---

## Installation

```bash
npm install @mobilelocker/javascript-sdk@2
# or pin the major:
# npm install @mobilelocker/javascript-sdk@^2.0.0
# yarn add @mobilelocker/javascript-sdk@^2.0.0
```

Require **Mobile Locker iOS 5.5.0+** for contacts/CRM list walks and the cursor envelope. Older hosts no longer offer unbound full dumps for those routes.

---

## Getting Started

<!-- TODO: Fill in the IVA onboarding steps here:
     - How is the JWT injected into the presentation URL?
     - Is there a specific script tag / loader required?
     - Any Mobile Locker admin setup needed before the SDK will work?
     - Link to the partner portal or relevant documentation?
-->

The SDK initializes automatically — there is no `init()` call required. It reads authentication and configuration from the `?jwt=` query parameter that Mobile Locker injects into every presentation URL at runtime.

```js
import mobilelocker from '@mobilelocker/javascript-sdk'

// The SDK is ready to use immediately after import
const user = await mobilelocker.user.get()
console.log(`Hello, ${user.name}`)
```

---

## Environment Detection

Use these helpers to branch behavior based on where your code is running:

```js
import mobilelocker from '@mobilelocker/javascript-sdk'

mobilelocker.isMobileLocker()  // true in any app or CDN context
mobilelocker.isApp()           // true in iOS, Android, or Windows
mobilelocker.isIOS()           // true specifically in the iOS or iPadOS app
mobilelocker.isAndroid()       // true specifically in the Android app
mobilelocker.isWindows()       // true specifically in the Windows app
mobilelocker.isElectron()      // true in the Electron Windows shell
mobilelocker.isCDN()           // true when served from a CDN presentation URL
```

---

## Domain Reference

The SDK is organized into domains. All methods are async unless noted.

### analytics

Track custom events within a presentation.

```js
mobilelocker.analytics.logEvent(category, action, uri, data)
// optional: data payload and internal method name
mobilelocker.analytics.logEvent('product', 'view', '/slides/overview', { productId: 42 })
```

### congresses

Access lead retrieval events, attendees, and business cards (badge/card scanning).

```js
const events = await mobilelocker.congresses.list()
const event = await mobilelocker.congresses.get(eventID)
const attendees = await mobilelocker.congresses.getAttendees(eventID)
const attendee = await mobilelocker.congresses.getAttendee(attendeeID)
const businessCards = await mobilelocker.congresses.getBusinessCards()
const card = await mobilelocker.congresses.getBusinessCard(cardID)
```

### contacts

Read the current user's contacts. Address books can exceed 100k contacts — there is **no** `getAll()` and **no** `getChunked(min, limit)` (**SDK 2.0 hard break** / iOS **5.5.0+**). Prefer `eachPage` so only one page is in memory at a time. Single pages use the host **cursor envelope** (MLJS-27 / [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)): `?limit=1…5000&cursor=` → `{ data, meta: { cursor: { next, count } } }`.

```js
const contact = await mobilelocker.contacts.get(contactID)

// Walk the book page by page — process each chunk; do not rebuild a full array
await mobilelocker.contacts.eachPage(500, (chunk) => {
    for (const c of chunk) {
        // render / index / filter this contact
    }
})

// Single page (limit 1…5000; optional cursor from meta.cursor.next)
const page = await mobilelocker.contacts.getPage(500)
if (page.meta.cursor.next) {
    const next = await mobilelocker.contacts.getPage(500, page.meta.cursor.next)
}
```

### crm

Interact with the connected CRM (Salesforce, etc.).

There is **no** full-table list API (**SDK 2.0 hard break** / MLJS-26). Prefer filtered SOQL via `crm.query`. For offline walks, use cursor paging (**iOS 5.5.0+**, same envelope as contacts / [MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)). Do not reassemble every page into one array for large tables.

```js
// Prefer SOQL for filtered access
const results = await mobilelocker.crm.query(
    'SELECT Id, Name FROM Account WHERE Name = :name',
    { name: 'Acme' },
)
// results.rows, results.totalSize, results.done

// Offline walk — process each page; do not rebuild a full array (iOS 5.5.0+)
await mobilelocker.crm.eachAccountsPage(500, (chunk) => {
    for (const account of chunk) {
        // handle one account
    }
})
await mobilelocker.crm.eachAddressesPage(500, (chunk) => { /* ... */ })
await mobilelocker.crm.eachContactsPage(500, (chunk) => { /* ... */ })
await mobilelocker.crm.eachLeadsPage(500, (chunk) => { /* ... */ })
await mobilelocker.crm.eachUsersPage(500, (chunk) => { /* ... */ })

// Single page (limit 1…5000; optional cursor from meta.cursor.next)
const page = await mobilelocker.crm.getAccountsPage(500)
if (page.meta.cursor.next) {
    const next = await mobilelocker.crm.getAccountsPage(500, page.meta.cursor.next)
}

// Fetch a single record by ID
const account = await mobilelocker.crm.getAccount(accountID)
const address = await mobilelocker.crm.getAddress(addressID)
const contact = await mobilelocker.crm.getContact(contactID)
const lead    = await mobilelocker.crm.getLead(leadID)
const user    = await mobilelocker.crm.getUser(userID)

// Customer session management
const current = await mobilelocker.crm.getCurrentCustomers()
const recent  = await mobilelocker.crm.getRecentCustomers()
const isCurrent = await mobilelocker.crm.isCurrentCustomer(objectID)
await mobilelocker.crm.setCurrentCustomers([id1, id2])
await mobilelocker.crm.addCurrentCustomer(id)
await mobilelocker.crm.removeCurrentCustomer(id)
await mobilelocker.crm.clearCurrentCustomers()

// iOS app only — opens native customer picker UI
const { status, customers } = await mobilelocker.crm.openCustomerPicker()
if (status === 'selected') console.log(customers)

// Sync
const { status: refreshStatus } = await mobilelocker.crm.refresh({ mode: 'incremental' })  // or 'full'
```

### data

Submit form/data capture events and fetch platform reference data.

```js
// Synchronous
mobilelocker.data.submitForm('lead-form', { firstName: 'Jane', email: 'jane@example.com' })

// Products
const products = await mobilelocker.data.getProducts()
const product  = await mobilelocker.data.getProduct(id)

// Labels
const labels = await mobilelocker.data.getLabels()
const label  = await mobilelocker.data.getLabel(id)

// Folders
const folders = await mobilelocker.data.getFolders()
const folder  = await mobilelocker.data.getFolder(id)

// Customers
const customers = await mobilelocker.data.getCustomers()
const customer  = await mobilelocker.data.getCustomer(crmObjectID)
```

### database

Query SQLite databases bundled with the current presentation.

```js
const databases = await mobilelocker.database.list()
// → ['products.sqlite', 'search/fts.db']

const result = await mobilelocker.database.query(
    'products.sqlite',
    'SELECT * FROM products WHERE category = ?',
    ['widgets'],
)
// result.rows                — array of row objects
// result.rows_affected       — integer (always 0 for SELECT)
// result.last_insert_row_id  — null for SELECT
```

Named parameters are also supported:

```js
const result = await mobilelocker.database.query(
    'products.sqlite',
    'SELECT * FROM products WHERE category = :category AND approved = :approved',
    { category: 'oncology', approved: 1 },
)
```

Inspect a table's shape (useful during development):

```js
const description = await mobilelocker.database.describe('products.sqlite', 'products')
// description.name    — 'products'
// description.sql     — 'CREATE TABLE products (id INTEGER PRIMARY KEY, ...)'
// description.columns — array of column info objects:
//   { cid, name, type, not_null, default_value, primary_key }
```

### device

Read device and app metadata (native app).

```js
const info = await mobilelocker.device.get()
// info.app.version, info.os.name, info.hardware.model, info.orientation, etc.
if (await mobilelocker.device.isAtLeastVersion('5.3.0')) {
  // feature gated on app version
}
```

### http

Make cross-origin HTTP requests. In the iOS app, requests are proxied through the native layer to avoid CORS restrictions.

```js
const response = await mobilelocker.http.get('https://api.example.com/data')
const response = await mobilelocker.http.post('https://api.example.com/submit', {body: payload})
// response.status, response.data, response.headers
```

### log

Structured logging with levels, filtering, and SDK log access.

```js
// Enable/disable debug mode (synchronous)
mobilelocker.log.setMode(true)
mobilelocker.log.isEnabled()   // → boolean

// Write log entries from your presentation code (synchronous)
mobilelocker.log.debug('Fetching products', { category: 'oncology' })
mobilelocker.log.info('Query returned 42 rows')
mobilelocker.log.warn('Result set large — consider paginating')
mobilelocker.log.error('Query failed', { error: err.message })

// Read SDK log entries (async)
const logs = await mobilelocker.log.getSdkLogs({ level: 'error', domain: 'crm' })
const results = await mobilelocker.log.searchSdkLogs('timeout', { domain: 'database' })

// Session mode (synchronous)
mobilelocker.log.liveMode()      // activate live session recording
mobilelocker.log.practiceMode()  // deactivate (practice mode)
```

### localforage

A localForage-compatible key-value store backed by native app storage — immune to the port-collision data loss problem in WKWebView. Use this instead of native `localforage` in any presentation that needs persistent key-value storage.

On iOS 5.3.0+ reads and writes go through the native app's local server. On CDN, Electron, and older iOS versions, localForage falls back automatically to IndexedDB — no environment detection required.

```js
// Drop-in replacement for localforage
await mobilelocker.localforage.setItem('user-prefs', { theme: 'dark', fontSize: 14 })
const prefs = await mobilelocker.localforage.getItem('user-prefs')

// Full localForage data API is supported
const count = await mobilelocker.localforage.length()
const keys  = await mobilelocker.localforage.keys()
await mobilelocker.localforage.removeItem('user-prefs')
await mobilelocker.localforage.clear()

// All value types supported by localForage work, including binary
await mobilelocker.localforage.setItem('buffer', new Uint8Array([1, 2, 3]).buffer)
const buf = await mobilelocker.localforage.getItem('buffer')  // → ArrayBuffer

// iterate with optional early exit
await mobilelocker.localforage.iterate((value, key, n) => {
    console.log(n, key, value)
})
```

> **Why not native `localforage`?** Native `localforage` uses IndexedDB, which is origin-scoped. In WKWebView each presentation runs on a unique port, so the origin changes between app versions and data is silently lost or isolated. `mobilelocker.localforage` routes storage through the native app layer, which is stable across port changes.

### network

Check connectivity status.

```js
const status = await mobilelocker.network.getStatus()
// status.connected — boolean
// status.type — 'wifi' | 'cellular' | 'wired' | 'none'
```

### permissions

Check iOS permission status (iOS app only). All methods return a safe default outside the iOS app rather than throwing.

```js
// Each returns { status, granted }
const camera       = await mobilelocker.permissions.camera()
const microphone   = await mobilelocker.permissions.microphone()
const photoLibrary = await mobilelocker.permissions.photoLibrary()
const location     = await mobilelocker.permissions.location()
const bluetooth    = await mobilelocker.permissions.bluetooth()

// status values: 'authorized' | 'denied' | 'restricted' | 'not_determined' | 'unknown'
// location also has: 'authorized_always' | 'authorized_when_in_use'
// photo library also has: 'limited'

// Returns { available, biometric_type, error }
const biometric = await mobilelocker.permissions.biometric()
// biometric_type: 'face_id' | 'touch_id' | 'optic_id' | 'none' | 'unknown'
```

### presentation

Access the current presentation and trigger lifecycle actions.

```js
const presentation = await mobilelocker.presentation.get()
await mobilelocker.presentation.download(presentationID)   // returns DownloadStatus
mobilelocker.presentation.reload()
```

### scanner

Trigger the device camera scanner (iOS app only).

```js
const result = await mobilelocker.scanner.scanBusinessCard(eventID)
const result = await mobilelocker.scanner.scanBadge(eventID)
// result.status — 'success' | 'cancelled' | 'failed'
// result.attendee or result.businessCard on success
```

### search

Search across presentations, customers, contacts, attendees, and business cards.

```js
const results = await mobilelocker.search.query('Acme', {
    types: ['customers', 'presentations'],
    limit: 10,
})
// results.customers.results, results.presentations.results, etc.
```

### session

Read events recorded during the current session.

```js
const events = await mobilelocker.session.getDeviceEvents()
```

### share

Share a presentation or send email.

```js
// Synchronous
mobilelocker.share.presentation(
    [{email: 'jane@example.com', name: 'Jane'}],
    mobilelocker.notificationLevels.NOTIFY_FIRST,
)

mobilelocker.share.email(
    {name: 'Jane', email: 'jane@example.com'},
    'Thanks for stopping by',
    'It was great to meet you.',
)
```

### storage

Persist arbitrary data tied to the current presentation/user context. Field names are snake_case (`team_id`, `created_at`, …).

```js
await mobilelocker.storage.save('scan-results', { leads: [...] })
const entry = await mobilelocker.storage.get('scan-results')       // single key
const entries = await mobilelocker.storage.getAll()                // current presentation
const all = await mobilelocker.storage.getAllAcrossPresentations() // all presentations for user
const filtered = await mobilelocker.storage.query({ name: 'scan-results', limit: 10 })
await mobilelocker.storage.delete('scan-results')
```

### ui

Control the presentation UI (iOS app only where noted).

```js
mobilelocker.ui.openPDF('/files/brochure.pdf', 'Product Brochure')

const result = await mobilelocker.ui.openVideo('/files/demo.mp4', {
    autoplay: true,
    showControls: true,
})
// result.status — 'completed' | 'dismissed' | 'failed'

mobilelocker.ui.showToolbar()   // iOS app only
```

### user

Get the currently authenticated user.

```js
const user = await mobilelocker.user.get()
// user.id, user.name, user.email, user.current_team_id
```

---

## Notification Levels

Used with `share.presentation()`:

```js
mobilelocker.notificationLevels.NOTIFY_NONE     // 0 — no notifications
mobilelocker.notificationLevels.NOTIFY_FIRST    // 1 — notify on first open only
mobilelocker.notificationLevels.NOTIFY_EVERY    // 2 — notify on every open
mobilelocker.notificationLevels.NOTIFY_WEEKLY   // 3 — weekly digest
mobilelocker.notificationLevels.NOTIFY_MONTHLY  // 4 — monthly digest
```

---

## Error Handling

All SDK methods throw typed errors. Import the error classes to handle them specifically:

```js
import mobilelocker, {
    MobileLockerError,
    MobileLockerCRMError,
    MobileLockerDatabaseError,
    MobileLockerHTTPError,
    MobileLockerHttpResponseError,
    GeneralErrorCode,
    CRMErrorCode,
    DatabaseErrorCode,
} from '@mobilelocker/javascript-sdk'

try {
    const account = await mobilelocker.crm.getAccount(accountID)
} catch (err) {
    if (err instanceof MobileLockerCRMError) {
        if (err.code === CRMErrorCode.AuthExpired) {
            // prompt re-authentication
        }
    }
}
```

### Error codes

| Class                           | Code constants                                                                  |
|---------------------------------|---------------------------------------------------------------------------------|
| `MobileLockerError`             | `GeneralErrorCode.NotConnected`, `ServerError`, `RequestTimeout`                |
| `MobileLockerCRMError`          | `CRMErrorCode.NotConnected`, `AuthExpired`, `SOQLInvalid`, `ServerError`        |
| `MobileLockerDatabaseError`     | `DatabaseErrorCode.NotReady`, `InvalidPath`, `WriteNotPermitted`, `QueryFailed` |
| `MobileLockerHTTPError`         | `HTTPErrorCode.NotConnected`, `ServerError`                                     |
| `MobileLockerHttpResponseError` | `.status`, `.statusText`, `.headers`, `.data` (non-2xx HTTP responses)          |

---

## TypeScript

The SDK ships with full TypeScript definitions. All domain types are exported:

```ts
import type {
    MobileLockerLocalForage,
    User,
    Presentation,
    PresentationFile,
    Product,
    Customer,
    Attendee,
    BusinessCard,
    UserContact,
    StorageEntry,
    SearchResults,
    DeviceInfo,
    NetworkStatus,
    PermissionResult,
    BiometricResult,
    PermissionStatus,
    BiometricType,
    ScanResult,
    HTTPResponse,
    VideoResult,
} from '@mobilelocker/javascript-sdk'
```

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full history of releases and breaking changes.

---

## Contributing

### Project structure

```
src/
  domains/   — one file per SDK domain (analytics, crm, database, …)
  types/     — entity types mirroring GRDB model toJSON() output
  errors.ts  — error classes and error code constants
  index.ts   — composes the mobilelocker object and re-exports everything
```

### Where to put types

**`src/types/`** — entity shapes that directly mirror a GRDB model's `toJSON()` output: `Presentation`, `Customer`, `Attendee`, `User`, etc. These are the data objects returned by the iOS app. A type belongs here if it represents a row from the database and could appear across multiple domains.

**`src/domains/<domain>.ts`** — parameter types, filter types, response envelopes, and status unions that are specific to a single domain's API surface: `SearchOptions`, `SearchResults`, `StorageFilter`, `ScanStatus`, `DownloadStatus`, etc. Keep these co-located with the functions that use them.

`src/types/database.ts` is the one exception — `DatabaseQueryResult`, `DatabaseColumnInfo`, and `DatabaseTableDescription` are domain-specific but live in `types/` because there are three related types that would clutter the database domain file.

### Wire format convention

All JSON keys use **snake_case** — consistent with the Laravel/Spatie backend that seeds the iOS database and with the GRDB model `toJSON()` methods that produce the wire format.

When a GRDB model in `mobilelocker-ios` gains or loses a field in its `toJSON()`, update the corresponding type in `src/types/` in the same change.

---

## License

ISC © Mobile Locker
