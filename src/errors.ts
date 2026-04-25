/**
 * Error codes shared across all SDK domains.
 * Use these as named constants rather than raw strings.
 *
 * @example
 * if (err.code === GeneralErrorCode.NotConnected) showOfflineBanner()
 */
export const GeneralErrorCode = {
    /** The device has no internet connection. */
    NotConnected:   'not_connected',
    /** The Mobile Locker server or an upstream API returned an unexpected error. */
    ServerError:    'server_error',
    /** The request exceeded the configured timeout. */
    RequestTimeout: 'request_timeout',
} as const
export type GeneralErrorCode = typeof GeneralErrorCode[keyof typeof GeneralErrorCode]

/**
 * Error codes for CRM-specific failures. Extends {@link GeneralErrorCode}.
 */
export const CRMErrorCode = {
    ...GeneralErrorCode,
    /** The team's CRM is not a supported provider (Salesforce, Veeva, or IQVIA). */
    NotSupported: 'crm_not_supported',
    /** The CRM session has expired — the user must re-authenticate in the app. */
    AuthExpired:  'crm_auth_expired',
    /** The SOQL query contains a syntax error. */
    SOQLInvalid:  'soql_invalid',
} as const
export type CRMErrorCode = typeof CRMErrorCode[keyof typeof CRMErrorCode]

/**
 * Error codes for SQLite database failures. Extends {@link GeneralErrorCode}.
 */
export const DatabaseErrorCode = {
    ...GeneralErrorCode,
    /** The databases are still being copied or opened after all retries. */
    NotReady:          'databases_not_ready',
    /** The requested path is not in the presentation's allowed file list. */
    InvalidPath:       'invalid_database_path',
    /** The SQL statement is not a SELECT — write operations are not permitted. */
    WriteNotPermitted: 'write_not_permitted',
    /** The SQL statement failed to execute. */
    QueryFailed:       'query_failed',
} as const
export type DatabaseErrorCode = typeof DatabaseErrorCode[keyof typeof DatabaseErrorCode]

/**
 * Error codes for HTTP request failures. Extends {@link GeneralErrorCode}.
 */
export const HTTPErrorCode = {
    ...GeneralErrorCode,
} as const
export type HTTPErrorCode = typeof HTTPErrorCode[keyof typeof HTTPErrorCode]

/**
 * Base error class thrown by SDK methods when no domain-specific error applies.
 *
 * @example
 * try {
 *   await mobilelocker.user.get()
 * } catch (err) {
 *   if (err instanceof MobileLockerError && err.code === GeneralErrorCode.NotConnected) {
 *     showOfflineBanner()
 *   }
 * }
 */
export class MobileLockerError extends Error {
    /** Machine-readable error code. Use {@link GeneralErrorCode} constants for comparisons. */
    readonly code: GeneralErrorCode

    constructor(message: string, code: GeneralErrorCode = GeneralErrorCode.ServerError) {
        super(message)
        this.name = 'MobileLockerError'
        this.code = code
        ;(Error as unknown as { captureStackTrace?: (t: object, c: unknown) => void })
            .captureStackTrace?.(this, new.target)
    }
}

/**
 * Thrown by `mobilelocker.crm.*` methods on CRM-specific failures.
 *
 * Check `code` against {@link CRMErrorCode} constants to handle specific cases
 * such as expired auth or invalid SOQL.
 */
export class MobileLockerCRMError extends Error {
    /** Machine-readable error code. Use {@link CRMErrorCode} constants for comparisons. */
    readonly code: CRMErrorCode
    /** The raw error message from the CRM, if available. */
    readonly crmMessage?: string

    constructor(message: string, code: CRMErrorCode, crmMessage?: string) {
        super(message)
        this.name = 'MobileLockerCRMError'
        this.code = code
        this.crmMessage = crmMessage
    }
}

/**
 * Thrown by `mobilelocker.database.*` methods on SQLite failures.
 *
 * Check `code` against {@link DatabaseErrorCode} constants to distinguish
 * path errors, write attempts, and query failures.
 */
export class MobileLockerDatabaseError extends Error {
    /** Machine-readable error code. Use {@link DatabaseErrorCode} constants for comparisons. */
    readonly code: DatabaseErrorCode
    /** The raw SQLite error message, if available. */
    readonly sqliteMessage?: string

    constructor(message: string, code: DatabaseErrorCode, sqliteMessage?: string) {
        super(message)
        this.name = 'MobileLockerDatabaseError'
        this.code = code
        this.sqliteMessage = sqliteMessage
    }
}

/**
 * Thrown by `mobilelocker.http.*` methods on network-level failures (timeout, no connection).
 *
 * For non-2xx HTTP responses, see {@link MobileLockerHttpResponseError}.
 */
export class MobileLockerHTTPError extends Error {
    /** Machine-readable error code. Use {@link HTTPErrorCode} constants for comparisons. */
    readonly code: HTTPErrorCode

    constructor(message: string, code: HTTPErrorCode) {
        super(message)
        this.name = 'MobileLockerHTTPError'
        this.code = code
    }
}

/**
 * Thrown by `mobilelocker.http.*` methods when the server returns a non-2xx HTTP status.
 *
 * Distinct from {@link MobileLockerHTTPError} — this means the request completed
 * but the server rejected it. Inspect `status` and `data` to handle the response.
 *
 * @example
 * try {
 *   await mobilelocker.http.post(url, payload)
 * } catch (err) {
 *   if (err instanceof MobileLockerHttpResponseError && err.status === 422) {
 *     showValidationError(err.data)
 *   }
 * }
 */
export class MobileLockerHttpResponseError extends Error {
    /** HTTP status code (e.g. `404`, `422`, `500`). */
    readonly status: number
    /** HTTP status text (e.g. `'Not Found'`). */
    readonly statusText: string
    /** Response headers as a flat key/value map. */
    readonly headers: Record<string, string>
    /** Parsed response body. */
    readonly data: unknown

    constructor(status: number, statusText: string, headers: Record<string, string>, data: unknown) {
        super(`HTTP ${status} ${statusText}`)
        this.name = 'MobileLockerHttpResponseError'
        this.status = status
        this.statusText = statusText
        this.headers = headers
        this.data = data
    }
}
