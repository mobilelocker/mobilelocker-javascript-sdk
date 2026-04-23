export const GeneralErrorCode = {
    NotConnected:   'not_connected',
    ServerError:    'server_error',
    RequestTimeout: 'request_timeout',
} as const
export type GeneralErrorCode = typeof GeneralErrorCode[keyof typeof GeneralErrorCode]

export const CRMErrorCode = {
    ...GeneralErrorCode,
    NotSupported: 'crm_not_supported',
    AuthExpired:  'crm_auth_expired',
    SOQLInvalid:  'soql_invalid',
} as const
export type CRMErrorCode = typeof CRMErrorCode[keyof typeof CRMErrorCode]

export const DatabaseErrorCode = {
    ...GeneralErrorCode,
    NotReady:          'databases_not_ready',
    InvalidPath:       'invalid_database_path',
    WriteNotPermitted: 'write_not_permitted',
    QueryFailed:       'query_failed',
} as const
export type DatabaseErrorCode = typeof DatabaseErrorCode[keyof typeof DatabaseErrorCode]

export const HTTPErrorCode = {
    ...GeneralErrorCode,
} as const
export type HTTPErrorCode = typeof HTTPErrorCode[keyof typeof HTTPErrorCode]

export class MobileLockerError extends Error {
    readonly code: GeneralErrorCode

    constructor(message: string, code: GeneralErrorCode = GeneralErrorCode.ServerError) {
        super(message)
        this.name = 'MobileLockerError'
        this.code = code
        ;(Error as unknown as { captureStackTrace?: (t: object, c: unknown) => void })
            .captureStackTrace?.(this, new.target)
    }
}

export class MobileLockerCRMError extends Error {
    readonly code: CRMErrorCode
    readonly crmMessage?: string

    constructor(message: string, code: CRMErrorCode, crmMessage?: string) {
        super(message)
        this.name = 'MobileLockerCRMError'
        this.code = code
        this.crmMessage = crmMessage
    }
}

export class MobileLockerDatabaseError extends Error {
    readonly code: DatabaseErrorCode
    readonly sqliteMessage?: string

    constructor(message: string, code: DatabaseErrorCode, sqliteMessage?: string) {
        super(message)
        this.name = 'MobileLockerDatabaseError'
        this.code = code
        this.sqliteMessage = sqliteMessage
    }
}

export class MobileLockerHTTPError extends Error {
    readonly code: HTTPErrorCode

    constructor(message: string, code: HTTPErrorCode) {
        super(message)
        this.name = 'MobileLockerHTTPError'
        this.code = code
    }
}

// Thrown by mobilelocker.http.* on non-2xx responses — distinct from MobileLockerHTTPError
export class MobileLockerHttpResponseError extends Error {
    readonly status: number
    readonly statusText: string
    readonly headers: Record<string, string>
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
