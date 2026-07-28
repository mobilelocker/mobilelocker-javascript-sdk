import axios from 'axios'

/**
 * Error codes shared across all SDK domains.
 * Use these as named constants rather than raw strings.
 *
 * @example
 * if (err.code === GeneralErrorCode.NotConnected) showOfflineBanner()
 */
export const GeneralErrorCode = {
    /** The device has no internet connection. */
    NotConnected:           'not_connected',
    /** The Mobile Locker server or an upstream API returned an unexpected error. */
    ServerError:            'server_error',
    /** The request exceeded the configured timeout. */
    RequestTimeout:         'request_timeout',
    /** A caller-supplied argument failed validation. */
    InvalidArgument:        'invalid_argument',
    /** The method is not supported in the current environment (e.g. iOS-only API in browser). */
    UnsupportedEnvironment: 'unsupported_environment',
    /** The requested resource was not found. */
    NotFound:               'not_found',
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
 * Base error class thrown by SDK methods.
 *
 * Domain-specific errors extend this class so `instanceof MobileLockerError` matches all of them.
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
    /** Machine-readable error code. Prefer the `*ErrorCode` constants for comparisons. */
    readonly code: string

    constructor(message: string, code: string = GeneralErrorCode.ServerError) {
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
export class MobileLockerCRMError extends MobileLockerError {
    declare readonly code: CRMErrorCode
    /** The raw error message from the CRM, if available. */
    readonly crmMessage?: string

    constructor(message: string, code: CRMErrorCode, crmMessage?: string) {
        super(message, code)
        this.name = 'MobileLockerCRMError'
        this.crmMessage = crmMessage
    }
}

/**
 * Thrown by `mobilelocker.database.*` methods on SQLite failures.
 *
 * Check `code` against {@link DatabaseErrorCode} constants to distinguish
 * path errors, write attempts, and query failures.
 */
export class MobileLockerDatabaseError extends MobileLockerError {
    declare readonly code: DatabaseErrorCode
    /** The raw SQLite error message, if available. */
    readonly sqliteMessage?: string

    constructor(message: string, code: DatabaseErrorCode, sqliteMessage?: string) {
        super(message, code)
        this.name = 'MobileLockerDatabaseError'
        this.sqliteMessage = sqliteMessage
    }
}

/**
 * Thrown by `mobilelocker.http.*` methods on network-level failures (timeout, no connection).
 *
 * For non-2xx HTTP responses, see {@link MobileLockerHttpResponseError}.
 */
export class MobileLockerHTTPError extends MobileLockerError {
    declare readonly code: HTTPErrorCode

    constructor(message: string, code: HTTPErrorCode) {
        super(message, code)
        this.name = 'MobileLockerHTTPError'
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
export class MobileLockerHttpResponseError extends MobileLockerError {
    /** HTTP status code (e.g. `404`, `422`, `500`). */
    readonly status: number
    /** HTTP status text (e.g. `'Not Found'`). */
    readonly statusText: string
    /** Response headers as a flat key/value map. */
    readonly headers: Record<string, string>
    /** Parsed response body. */
    readonly data: unknown

    constructor(status: number, statusText: string, headers: Record<string, string>, data: unknown) {
        super(`HTTP ${status} ${statusText}`, GeneralErrorCode.ServerError)
        this.name = 'MobileLockerHttpResponseError'
        this.status = status
        this.statusText = statusText
        this.headers = headers
        this.data = data
    }
}

/** Extract a human-readable message from an Axios error body when present. */
function axiosMessage(err: unknown): string {
    if (!axios.isAxiosError(err)) return String(err)
    const body = err.response?.data as { message?: string; error?: string } | undefined
    return body?.message ?? body?.error ?? err.message
}

/**
 * Map an unknown failure into {@link MobileLockerError}.
 * Re-throws existing MobileLockerError instances unchanged.
 */
export function mapToMobileLockerError(err: unknown): MobileLockerError {
    if (err instanceof MobileLockerError) return err
    if (axios.isAxiosError(err) && !err.response) {
        return new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
    }
    return new MobileLockerError(axiosMessage(err), GeneralErrorCode.ServerError)
}

/**
 * Map an unknown failure into {@link MobileLockerCRMError}.
 */
export function mapToCRMError(err: unknown): MobileLockerCRMError {
    if (err instanceof MobileLockerCRMError) return err
    if (err instanceof MobileLockerError) {
        return new MobileLockerCRMError(err.message, err.code as CRMErrorCode)
    }
    if (axios.isAxiosError(err)) {
        if (!err.response) return new MobileLockerCRMError('No internet connection', CRMErrorCode.NotConnected)
        const status = err.response.status
        const msg = axiosMessage(err)
        if (status === 401 || status === 403) {
            return new MobileLockerCRMError('CRM session expired', CRMErrorCode.AuthExpired)
        }
        if (status === 400) return new MobileLockerCRMError(msg, CRMErrorCode.SOQLInvalid, msg)
        return new MobileLockerCRMError(msg, CRMErrorCode.ServerError)
    }
    return new MobileLockerCRMError(String(err), CRMErrorCode.ServerError)
}

/**
 * Map an unknown failure into {@link MobileLockerDatabaseError}.
 */
export function mapToDatabaseError(err: unknown): MobileLockerDatabaseError {
    if (err instanceof MobileLockerDatabaseError) return err
    if (err instanceof MobileLockerError) {
        return new MobileLockerDatabaseError(err.message, err.code as DatabaseErrorCode)
    }
    if (axios.isAxiosError(err)) {
        if (!err.response) {
            return new MobileLockerDatabaseError('No internet connection', DatabaseErrorCode.NotConnected)
        }
        const status = err.response.status
        const body = err.response.data as { error?: string; sqlite_message?: string }
        const msg = body?.error ?? err.message
        const sqliteMsg = body?.sqlite_message
        if (status === 400) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.InvalidPath)
        if (status === 403) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.WriteNotPermitted)
        if (status === 503) return new MobileLockerDatabaseError(msg, DatabaseErrorCode.NotReady)
        return new MobileLockerDatabaseError(msg, DatabaseErrorCode.QueryFailed, sqliteMsg)
    }
    return new MobileLockerDatabaseError(String(err), DatabaseErrorCode.QueryFailed)
}

/** Error for methods that only work in a specific host environment. */
export function unsupportedEnvironmentError(method: string, environment = 'the iOS app'): MobileLockerError {
    return new MobileLockerError(
        `${method} is only supported in ${environment}`,
        GeneralErrorCode.UnsupportedEnvironment,
    )
}

/** Error for invalid caller-supplied arguments. */
export function invalidArgumentError(message: string): MobileLockerError {
    return new MobileLockerError(message, GeneralErrorCode.InvalidArgument)
}
