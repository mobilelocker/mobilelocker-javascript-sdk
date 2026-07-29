import { describe, expect, it } from 'vitest'
import {
    CRMErrorCode,
    DatabaseErrorCode,
    GeneralErrorCode,
    HTTPErrorCode,
    MobileLockerCRMError,
    MobileLockerDatabaseError,
    MobileLockerError,
    MobileLockerHTTPError,
    MobileLockerHttpResponseError,
    invalidArgumentError,
    mapToCRMError,
    mapToDatabaseError,
    mapToMobileLockerError,
    unsupportedEnvironmentError,
} from '../src/errors'
import { makeAxiosError } from './helpers/axios'

describe('error classes', () => {
    it('MobileLockerError defaults code to ServerError', () => {
        const err = new MobileLockerError('boom')
        expect(err).toBeInstanceOf(Error)
        expect(err).toBeInstanceOf(MobileLockerError)
        expect(err.name).toBe('MobileLockerError')
        expect(err.message).toBe('boom')
        expect(err.code).toBe(GeneralErrorCode.ServerError)
    })

    it('domain errors extend MobileLockerError (instanceof chain for 2.0)', () => {
        const crm = new MobileLockerCRMError('crm', CRMErrorCode.AuthExpired, 'raw')
        const db = new MobileLockerDatabaseError('db', DatabaseErrorCode.NotReady, 'sqlite')
        const http = new MobileLockerHTTPError('http', HTTPErrorCode.RequestTimeout)
        const resp = new MobileLockerHttpResponseError(422, 'Unprocessable', { 'x-a': '1' }, { e: true })

        expect(crm).toBeInstanceOf(MobileLockerError)
        expect(db).toBeInstanceOf(MobileLockerError)
        expect(http).toBeInstanceOf(MobileLockerError)
        expect(resp).toBeInstanceOf(MobileLockerError)

        expect(crm.crmMessage).toBe('raw')
        expect(db.sqliteMessage).toBe('sqlite')
        expect(resp.status).toBe(422)
        expect(resp.data).toEqual({ e: true })
        expect(resp.message).toBe('HTTP 422 Unprocessable')
    })
})

describe('mapToMobileLockerError', () => {
    it('re-throws existing MobileLockerError unchanged', () => {
        const original = new MobileLockerError('keep', GeneralErrorCode.NotFound)
        expect(mapToMobileLockerError(original)).toBe(original)
    })

    it('maps axios network failure (no response) to NotConnected', () => {
        const err = mapToMobileLockerError(makeAxiosError('Network Error'))
        expect(err).toBeInstanceOf(MobileLockerError)
        expect(err.code).toBe(GeneralErrorCode.NotConnected)
        expect(err.message).toBe('No internet connection')
    })

    it('maps axios response errors to ServerError with body message when present', () => {
        const err = mapToMobileLockerError(
            makeAxiosError('Request failed', { status: 500, data: { message: 'upstream' } }),
        )
        expect(err.code).toBe(GeneralErrorCode.ServerError)
        expect(err.message).toBe('upstream')
    })

    it('falls back to error field then axios message', () => {
        const viaError = mapToMobileLockerError(
            makeAxiosError('Request failed', { status: 500, data: { error: 'err-field' } }),
        )
        expect(viaError.message).toBe('err-field')

        const viaMessage = mapToMobileLockerError(
            makeAxiosError('plain axios', { status: 500, data: {} }),
        )
        expect(viaMessage.message).toBe('plain axios')
    })

    it('wraps unknown values', () => {
        const err = mapToMobileLockerError('string failure')
        expect(err.message).toBe('string failure')
        expect(err.code).toBe(GeneralErrorCode.ServerError)
    })
})

describe('mapToCRMError', () => {
    it('passes through MobileLockerCRMError', () => {
        const original = new MobileLockerCRMError('x', CRMErrorCode.SOQLInvalid)
        expect(mapToCRMError(original)).toBe(original)
    })

    it('converts MobileLockerError into CRM error preserving code', () => {
        const err = mapToCRMError(new MobileLockerError('m', GeneralErrorCode.NotFound))
        expect(err).toBeInstanceOf(MobileLockerCRMError)
        expect(err.code).toBe(GeneralErrorCode.NotFound)
        expect(err.message).toBe('m')
    })

    it('maps 401/403 to AuthExpired', () => {
        expect(mapToCRMError(makeAxiosError('x', { status: 401 })).code).toBe(CRMErrorCode.AuthExpired)
        expect(mapToCRMError(makeAxiosError('x', { status: 403 })).code).toBe(CRMErrorCode.AuthExpired)
    })

    it('maps 400 to SOQLInvalid with crmMessage', () => {
        const err = mapToCRMError(
            makeAxiosError('bad soql', { status: 400, data: { message: 'unexpected token' } }),
        )
        expect(err.code).toBe(CRMErrorCode.SOQLInvalid)
        expect(err.crmMessage).toBe('unexpected token')
    })

    it('maps network failure to NotConnected', () => {
        expect(mapToCRMError(makeAxiosError('offline')).code).toBe(CRMErrorCode.NotConnected)
    })
})

describe('mapToDatabaseError', () => {
    it('maps 400 → InvalidPath, 403 → WriteNotPermitted, 503 → NotReady', () => {
        expect(mapToDatabaseError(makeAxiosError('x', { status: 400, data: { error: 'bad path' } })).code)
            .toBe(DatabaseErrorCode.InvalidPath)
        expect(mapToDatabaseError(makeAxiosError('x', { status: 403, data: { error: 'no writes' } })).code)
            .toBe(DatabaseErrorCode.WriteNotPermitted)
        expect(mapToDatabaseError(makeAxiosError('x', { status: 503, data: { error: 'warming' } })).code)
            .toBe(DatabaseErrorCode.NotReady)
    })

    it('maps other statuses to QueryFailed and preserves sqlite_message', () => {
        const err = mapToDatabaseError(
            makeAxiosError('x', {
                status: 500,
                data: { error: 'sql boom', sqlite_message: 'no such table' },
            }),
        )
        expect(err.code).toBe(DatabaseErrorCode.QueryFailed)
        expect(err.sqliteMessage).toBe('no such table')
        expect(err.message).toBe('sql boom')
    })

    it('maps network failure to NotConnected', () => {
        expect(mapToDatabaseError(makeAxiosError('offline')).code).toBe(DatabaseErrorCode.NotConnected)
    })
})

describe('helpers', () => {
    it('unsupportedEnvironmentError uses UnsupportedEnvironment code', () => {
        const err = unsupportedEnvironmentError('scanBadge()')
        expect(err.code).toBe(GeneralErrorCode.UnsupportedEnvironment)
        expect(err.message).toMatch(/scanBadge\(\) is only supported in the iOS app/)
    })

    it('invalidArgumentError uses InvalidArgument code', () => {
        const err = invalidArgumentError('bad arg')
        expect(err.code).toBe(GeneralErrorCode.InvalidArgument)
        expect(err.message).toBe('bad arg')
    })
})
