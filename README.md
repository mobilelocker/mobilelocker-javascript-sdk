# Mobile Locker JavaScript SDK

The official JavaScript SDK for building interactive presentations and custom features on the Mobile Locker platform.

## Overview

This SDK gives IVA developers programmatic access to the Mobile Locker platform from within a presentation — including user data, CRM records, analytics, device capabilities, storage, and more.

The SDK works in two environments:

| Environment | Description                                                                  |
|-------------|------------------------------------------------------------------------------|
| **iOS App** | Running inside the Mobile Locker iOS app (`isMobileLockerApp() === true`)    |
| **CDN**     | Loaded as part of a CDN-hosted presentation (`isMobileLockerCDN() === true`) |

When running outside of either environment (e.g. local development), most SDK calls are silently no-ops or return sensible local fallbacks. No errors are thrown — so you can develop locally without a live Mobile Locker context.

---

## Installation

```bash
npm install @mobilelocker/javascript-sdk
# or
yarn add @mobilelocker/javascript-sdk
```

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
import mobilelocker from '@mobilelocker/sdk'

// The SDK is ready to use immediately after import
const user = await mobilelocker.user.get()
console.log(`Hello, ${user.name}`)
```

---

## Environment Detection

Use these helpers to branch behavior based on where your code is running:

```js
import mobilelocker from '@mobilelocker/sdk'

mobilelocker.isMobileLocker()        // true in app or CDN
mobilelocker.isMobileLockerApp()     // true in iOS or iPadOS app
mobilelocker.isMobileLockerIOSApp()  // true specifically in the iOS app
mobilelocker.isMobileLockerCDN()     // true when served from a CDN presentation URL
```

---

## Domain Reference

The SDK is organized into domains. All methods are async unless noted.

### `analytics`

Track custom events within a presentation.

```js
mobilelocker.analytics.logEvent(category, action, uri, data)
mobilelocker.analytics.trackPageView(uri)
```

### `congresses`

Access lead retrieval events and attendees (badge/card scanning).

```js
const events = await mobilelocker.congresses.list()
const attendees = await mobilelocker.congresses.getAttendees(eventID)
const businessCards = await mobilelocker.congresses.getBusinessCards(eventID)
await mobilelocker.congresses.submitLead(eventID, attendeeID, data)
```

### `contacts`

Read the current user's contacts.

```js
const contacts = await mobilelocker.contacts.getAll()
const chunk = await mobilelocker.contacts.getChunked(minID, limit)
```

### `crm`

Interact with the connected CRM (Salesforce, etc.).

```js
const accounts = await mobilelocker.crm.getAccounts()
await mobilelocker.crm.refresh('incremental')   // or 'full'
const results = await mobilelocker.crm.query('SELECT Id, Name FROM Account')
```

### `data`

Submit form/data capture events.

```js
// Synchronous
mobilelocker.data.submitForm('lead-form', {firstName: 'Jane', email: 'jane@example.com'})
```

### `database`

Query SQLite databases bundled with the current presentation.

```js
const databases = await mobilelocker.database.list()
// → ['products.sqlite', 'search/fts.db']

const result = await mobilelocker.database.query(
    'products.sqlite',
    'SELECT * FROM products WHERE category = ?',
    ['widgets'],
)
// result.rows           — array of row objects
// result.rowsAffected   — integer (always 0 for SELECT)
// result.lastInsertRowId — null for SELECT
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
//   { cid, name, type, notNull, defaultValue, primaryKey }
```

### `device`

Read device and app metadata (iOS app only).

```js
const info = await mobilelocker.device.getInfo()
// info.app.version, info.os.name, info.hardware.model, info.orientation, etc.
```

### `http`

Make cross-origin HTTP requests. In the iOS app, requests are proxied through the native layer to avoid CORS restrictions.

```js
const response = await mobilelocker.http.get('https://api.example.com/data')
const response = await mobilelocker.http.post('https://api.example.com/submit', {body: payload})
// response.status, response.data, response.headers
```

### `log`

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

// Manage log entries (async)
await mobilelocker.log.deleteSdkLog(id)
await mobilelocker.log.clearSdkLogs()
```

### `network`

Check connectivity status.

```js
const status = await mobilelocker.network.getStatus()
// status.connected — boolean
// status.type — 'wifi' | 'cellular' | 'wired' | 'none'
```

### `presentation`

Access the current presentation and trigger lifecycle actions.

```js
const presentation = await mobilelocker.presentation.get()
await mobilelocker.presentation.download(presentationID)   // returns DownloadStatus
mobilelocker.presentation.reload()
```

### `scanner`

Trigger the device camera scanner (iOS app only).

```js
const result = await mobilelocker.scanner.scanBusinessCard(eventID)
const result = await mobilelocker.scanner.scanBadge(eventID)
// result.status — 'success' | 'cancelled' | 'failed'
// result.attendee or result.businessCard on success
```

### `search`

Search across presentations, customers, contacts, attendees, and business cards.

```js
const results = await mobilelocker.search.query('Acme', {
    types: ['customers', 'presentations'],
    limit: 10,
})
// results.customers.results, results.presentations.results, etc.
```

### `session`

Read events recorded during the current session.

```js
const events = await mobilelocker.session.getDeviceEvents()
```

### `share`

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

### `storage`

Persist arbitrary data tied to the current presentation/user context.

```js
await mobilelocker.storage.set('scan-results', {leads: [...]})
const entry = await mobilelocker.storage.get('scan-results')
const entries = await mobilelocker.storage.getAll({name: 'scan-results'})
await mobilelocker.storage.delete('scan-results')
```

### `ui`

Control the presentation UI (iOS app only where noted).

```js
mobilelocker.ui.openPDF('/files/brochure.pdf', 'Product Brochure')

const result = await mobilelocker.ui.playVideo('/files/demo.mp4', {
    autoplay: true,
    showControls: true,
})
// result.status — 'completed' | 'dismissed' | 'failed'

mobilelocker.ui.showToolbar()   // iOS app only
mobilelocker.ui.hideToolbar()   // iOS app only
```

### `user`

Get the currently authenticated user.

```js
const user = await mobilelocker.user.get()
// user.id, user.name, user.email, user.teamID
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
} from '@mobilelocker/sdk'

try {
    const accounts = await mobilelocker.crm.getAccounts()
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
    User,
    Presentation,
    Customer,
    Attendee,
    BusinessCard,
    UserContact,
    StorageEntry,
    SearchResults,
    DeviceInfo,
    NetworkStatus,
    ScanResult,
    HTTPResponse,
    VideoResult,
} from '@mobilelocker/sdk'
```

---

## License

ISC © Mobile Locker
