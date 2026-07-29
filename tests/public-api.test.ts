import { describe, expect, it } from 'vitest'
import mobilelocker, {
    GeneralErrorCode,
    MobileLockerError,
    contacts,
    crm,
    isAndroid,
    isApp,
    isCDN,
    isElectron,
    isIOS,
    isMobileLocker,
    storage,
    withStatusBooleans,
} from '../src/index'

describe('public API surface (SDK 2.0)', () => {
    it('default export exposes environment helpers and all domains', () => {
        expect(mobilelocker.isMobileLocker).toBeTypeOf('function')
        expect(mobilelocker.isApp).toBeTypeOf('function')
        expect(mobilelocker.isCDN).toBeTypeOf('function')
        expect(mobilelocker.isIOS).toBeTypeOf('function')
        expect(mobilelocker.isAndroid).toBeTypeOf('function')
        expect(mobilelocker.isElectron).toBeTypeOf('function')
        expect(mobilelocker.MobileLockerError).toBe(MobileLockerError)

        const domains = [
            'analytics', 'congresses', 'contacts', 'crm', 'data', 'database', 'log',
            'device', 'http', 'network', 'permissions', 'presentation', 'scanner',
            'search', 'session', 'share', 'localforage', 'storage', 'ui', 'user',
        ] as const
        for (const name of domains) {
            expect(mobilelocker, name).toHaveProperty(name)
        }

        expect(mobilelocker.notificationLevels).toMatchObject({
            NOTIFY_NONE: 0,
            NOTIFY_FIRST: 1,
            NOTIFY_EVERY: 2,
            NOTIFY_WEEKLY: 3,
            NOTIFY_MONTHLY: 4,
        })
    })

    it('named exports include env helpers and 2.0 utilities', () => {
        expect(isMobileLocker).toBeTypeOf('function')
        expect(isApp).toBeTypeOf('function')
        expect(isCDN).toBeTypeOf('function')
        expect(isIOS).toBeTypeOf('function')
        expect(isAndroid).toBeTypeOf('function')
        expect(isElectron).toBeTypeOf('function')
        expect(withStatusBooleans).toBeTypeOf('function')
        expect(GeneralErrorCode.InvalidArgument).toBe('invalid_argument')
        expect(GeneralErrorCode.UnsupportedEnvironment).toBe('unsupported_environment')
        expect(GeneralErrorCode.NotFound).toBe('not_found')
    })

    it('contacts expose only cursor paging surface (removed getAll / getChunked)', () => {
        expect(contacts.get).toBeTypeOf('function')
        expect(contacts.getPage).toBeTypeOf('function')
        expect(contacts.eachPage).toBeTypeOf('function')
        expect(contacts).not.toHaveProperty('getAll')
        expect(contacts).not.toHaveProperty('getChunked')
        expect(mobilelocker.contacts).not.toHaveProperty('getAll')
        expect(mobilelocker.contacts).not.toHaveProperty('getChunked')
    })

    it('crm exposes page walkers and not removed full-list getters', () => {
        expect(crm.getAccountsPage).toBeTypeOf('function')
        expect(crm.eachAccountsPage).toBeTypeOf('function')
        expect(crm.getAddressesPage).toBeTypeOf('function')
        expect(crm.eachAddressesPage).toBeTypeOf('function')
        expect(crm.getContactsPage).toBeTypeOf('function')
        expect(crm.eachContactsPage).toBeTypeOf('function')
        expect(crm.getLeadsPage).toBeTypeOf('function')
        expect(crm.eachLeadsPage).toBeTypeOf('function')
        expect(crm.getUsersPage).toBeTypeOf('function')
        expect(crm.eachUsersPage).toBeTypeOf('function')
        expect(crm.query).toBeTypeOf('function')

        for (const removed of ['getAccounts', 'getAddresses', 'getContacts', 'getLeads', 'getUsers']) {
            expect(crm).not.toHaveProperty(removed)
            expect(mobilelocker.crm).not.toHaveProperty(removed)
        }
    })

    it('storage exposes 2.0 names and not getAllForPresentation', () => {
        expect(storage.getAll).toBeTypeOf('function')
        expect(storage.getAllAcrossPresentations).toBeTypeOf('function')
        expect(storage).not.toHaveProperty('getAllForPresentation')
        expect(mobilelocker.storage).not.toHaveProperty('getAllForPresentation')
    })
})
