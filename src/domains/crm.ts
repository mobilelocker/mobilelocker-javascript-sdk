import { apiClient, getEndpoint, isIOS, withRetry } from '../env'
import { mapToCRMError, unsupportedEnvironmentError } from '../errors'
import type { Customer } from '../types/customer'
import type { CRMAccount, CRMAddress, CRMContact, CRMLead, CRMUser } from '../types/crm'
import type { Page } from '../types/page'
import { pagedListAPI } from '../utils/page'
import { withStatusBooleans, WithStatusBooleans } from '../utils/status'

export type CRMRefreshMode = 'incremental' | 'full'
export type CRMRefreshStatus = 'started' | 'not_connected'
export type PickerStatus = 'selected' | 'cancelled'

const PICKER_STATUSES = ['selected', 'cancelled'] as const
const REFRESH_STATUSES = ['started', 'not_connected'] as const

export type PickerResult = WithStatusBooleans<{ status: PickerStatus; customers?: Customer[] }>
export type CRMRefreshResult = WithStatusBooleans<{ status: CRMRefreshStatus }>

export interface CRMQueryResult {
    rows: Record<string, unknown>[]
    totalSize: number
    done: boolean
}

// Cursor list routes share one host contract (MLI-1718 / MLJS-26). Bound once per entity.
const accountsList = pagedListAPI<CRMAccount>('/crm/accounts', mapToCRMError)
const addressesList = pagedListAPI<CRMAddress>('/crm/addresses', mapToCRMError)
const contactsList = pagedListAPI<CRMContact>('/crm/contacts', mapToCRMError)
const leadsList = pagedListAPI<CRMLead>('/crm/leads', mapToCRMError)
const usersList = pagedListAPI<CRMUser>('/crm/users', mapToCRMError)

/** @category CRM */
export const crm = {
    /**
     * Get one page of CRM accounts (cursor envelope).
     *
     * Requires Mobile Locker iOS 5.5.0+. Prefer {@link crm.eachAccountsPage} when
     * walking the full set, or filter with {@link crm.query} (SOQL) when possible.
     * Do not reassemble every page into one array for large tables (MLJS-26).
     *
     * Host: `GET /mobilelocker/api/crm/accounts?limit=&cursor=`
     * → `{ data, meta: { cursor: { next, count } } }` ([MLI-1718](https://mobilelocker.atlassian.net/browse/MLI-1718)).
     * Same envelope for addresses, contacts, leads, and users.
     *
     * @param limit - Page size (**1…5000**).
     * @param cursor - From previous `meta.cursor.next`. Omit for the first page.
     * @returns {@link Page} of {@link CRMAccount} records.
     * @throws {@link MobileLockerError} with code `InvalidArgument` when `limit` is out of range.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    getAccountsPage(limit: number, cursor?: string): Promise<Page<CRMAccount>> {
        return accountsList.getPage(limit, cursor)
    },

    /**
     * Walk CRM accounts page by page without loading the full table into memory.
     *
     * Replaces the removed `getAccounts()` (MLJS-26). Advances only via
     * `meta.cursor.next`; stops when `next === null`. Prefer {@link crm.query}
     * for filtered access. Do **not** push chunks into a growing array unless
     * the set is known to be small. Requires iOS 5.5.0+.
     *
     * @param pageSize - Page size passed to {@link crm.getAccountsPage} (**1…5000**).
     * @param handler - Called once per non-empty page; may be async.
     * @throws {@link MobileLockerError} when `pageSize` is out of range.
     * @throws {@link MobileLockerCRMError} on network/server error.
     *
     * @example
     * ```js
     * await mobilelocker.crm.eachAccountsPage(500, (chunk) => {
     *   for (const account of chunk) {
     *     // handle one account — never accumulate the full table
     *   }
     * })
     * ```
     */
    eachAccountsPage(
        pageSize: number,
        handler: (chunk: CRMAccount[]) => void | Promise<void>,
    ): Promise<void> {
        return accountsList.eachPage(pageSize, handler)
    },

    /**
     * Get a specific CRM account by ID.
     *
     * @param accountID - The CRM account ID to fetch.
     * @returns CRM account record.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getAccount(accountID: string): Promise<CRMAccount> {
        try {
            const { data } = await withRetry(() => apiClient.get<CRMAccount>(getEndpoint(`/crm/accounts/${accountID}`)))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get one page of CRM addresses. Same cursor envelope as {@link crm.getAccountsPage}
     * (iOS 5.5.0+, limit **1…5000**). Prefer {@link crm.eachAddressesPage} or {@link crm.query}.
     */
    getAddressesPage(limit: number, cursor?: string): Promise<Page<CRMAddress>> {
        return addressesList.getPage(limit, cursor)
    },

    /**
     * Walk CRM addresses page by page (`meta.cursor.next` only). Replaces removed `getAddresses()`.
     */
    eachAddressesPage(
        pageSize: number,
        handler: (chunk: CRMAddress[]) => void | Promise<void>,
    ): Promise<void> {
        return addressesList.eachPage(pageSize, handler)
    },

    /**
     * Get a specific CRM address by ID.
     *
     * @param addressID - The CRM address ID to fetch.
     * @returns CRM address record.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getAddress(addressID: string): Promise<CRMAddress> {
        try {
            const { data } = await withRetry(() => apiClient.get<CRMAddress>(getEndpoint(`/crm/addresses/${addressID}`)))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get one page of CRM contacts. Same cursor envelope as {@link crm.getAccountsPage}
     * (iOS 5.5.0+, limit **1…5000**). Prefer {@link crm.eachContactsPage} or {@link crm.query}.
     */
    getContactsPage(limit: number, cursor?: string): Promise<Page<CRMContact>> {
        return contactsList.getPage(limit, cursor)
    },

    /**
     * Walk CRM contacts page by page (`meta.cursor.next` only). Replaces removed `getContacts()`.
     *
     * @example
     * ```js
     * await mobilelocker.crm.eachContactsPage(500, (chunk) => {
     *   for (const contact of chunk) {
     *     // handle one contact
     *   }
     * })
     * ```
     */
    eachContactsPage(
        pageSize: number,
        handler: (chunk: CRMContact[]) => void | Promise<void>,
    ): Promise<void> {
        return contactsList.eachPage(pageSize, handler)
    },

    /**
     * Get a specific CRM contact by ID.
     *
     * @param contactID - The CRM contact ID to fetch.
     * @returns CRM contact record.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getContact(contactID: string): Promise<CRMContact> {
        try {
            const { data } = await withRetry(() => apiClient.get<CRMContact>(getEndpoint(`/crm/contacts/${contactID}`)))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get one page of CRM leads. Same cursor envelope as {@link crm.getAccountsPage}
     * (iOS 5.5.0+, limit **1…5000**). Prefer {@link crm.eachLeadsPage} or {@link crm.query}.
     */
    getLeadsPage(limit: number, cursor?: string): Promise<Page<CRMLead>> {
        return leadsList.getPage(limit, cursor)
    },

    /**
     * Walk CRM leads page by page (`meta.cursor.next` only). Replaces removed `getLeads()`.
     */
    eachLeadsPage(
        pageSize: number,
        handler: (chunk: CRMLead[]) => void | Promise<void>,
    ): Promise<void> {
        return leadsList.eachPage(pageSize, handler)
    },

    /**
     * Get a specific CRM lead by ID.
     *
     * @param leadID - The CRM lead ID to fetch.
     * @returns CRM lead record.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getLead(leadID: string): Promise<CRMLead> {
        try {
            const { data } = await withRetry(() => apiClient.get<CRMLead>(getEndpoint(`/crm/leads/${leadID}`)))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get one page of CRM users. Same cursor envelope as {@link crm.getAccountsPage}
     * (iOS 5.5.0+, limit **1…5000**). Prefer {@link crm.eachUsersPage} or {@link crm.query}.
     */
    getUsersPage(limit: number, cursor?: string): Promise<Page<CRMUser>> {
        return usersList.getPage(limit, cursor)
    },

    /**
     * Walk CRM users page by page (`meta.cursor.next` only). Replaces removed `getUsers()`.
     */
    eachUsersPage(
        pageSize: number,
        handler: (chunk: CRMUser[]) => void | Promise<void>,
    ): Promise<void> {
        return usersList.eachPage(pageSize, handler)
    },

    /**
     * Get a specific CRM user by ID.
     *
     * @param userID - The CRM user ID to fetch.
     * @returns CRM user record.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getUser(userID: string): Promise<CRMUser> {
        try {
            const { data } = await withRetry(() => apiClient.get<CRMUser>(getEndpoint(`/crm/users/${userID}`)))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Open the native customer picker UI and let the user select one or more customers.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @returns An object with `status` (`'selected'` or `'cancelled'`) and an optional `customers` array.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     *
     * @example
     * const { status, customers } = await mobilelocker.crm.openCustomerPicker()
     * if (status === 'selected') console.log(customers)
     */
    async openCustomerPicker(): Promise<PickerResult> {
        if (!isIOS()) throw unsupportedEnvironmentError('openCustomerPicker()')
        try {
            const { data } = await withRetry(() => apiClient.post<{ status: PickerStatus; customers?: Customer[] }>(getEndpoint('/open-customer-picker')))
            return withStatusBooleans(data, PICKER_STATUSES)
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get the customers currently associated with the active presentation session.
     *
     * @returns Array of {@link Customer} objects.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async getCurrentCustomers(): Promise<Customer[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer[]>(getEndpoint('/crm/customers/current')))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Get the customers most recently viewed by the current user.
     *
     * @returns Array of {@link Customer} objects, newest first.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async getRecentCustomers(): Promise<Customer[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer[]>(getEndpoint('/crm/customers/recent')))
            return data
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Check whether a CRM object is currently associated with the active session.
     *
     * @param objectID - The CRM object ID to check (e.g. a Salesforce Account ID).
     * @returns `true` if the customer is current, `false` otherwise.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async isCurrentCustomer(objectID: string): Promise<boolean> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<{ isCurrent: boolean }>(getEndpoint('/crm/customers/is-current'), { params: { objectID } }),
            )
            return data.isCurrent
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Replace the current customers for the active session.
     *
     * @param customerIDs - Array of CRM object IDs to set as current.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async setCurrentCustomers(customerIDs: string[]): Promise<void> {
        try {
            await withRetry(() => apiClient.post(getEndpoint('/crm/customers/current'), { customerIDs }))
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Add a single customer to the current session without replacing existing ones.
     *
     * @param customerID - The CRM object ID of the customer to add.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async addCurrentCustomer(customerID: string): Promise<void> {
        try {
            await withRetry(() => apiClient.put(getEndpoint('/crm/customers/current/add'), { customerID }))
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Remove a single customer from the current session.
     *
     * @param customerID - The CRM object ID of the customer to remove.
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async removeCurrentCustomer(customerID: string): Promise<void> {
        try {
            await withRetry(() => apiClient.put(getEndpoint('/crm/customers/current/remove'), { customerID }))
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Remove all customers from the current session.
     *
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async clearCurrentCustomers(): Promise<void> {
        try {
            await withRetry(() => apiClient.delete(getEndpoint('/crm/customers/current')))
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Trigger a CRM data refresh for the current user.
     *
     * @param options.mode - `'incremental'` (default) syncs only new/changed records; `'full'` re-syncs everything.
     * @returns An object with `status`: `'started'` if the refresh was queued, `'not_connected'` if the CRM is unreachable.
     * @throws {@link MobileLockerCRMError} on auth expiry or server error.
     *
     * @example
     * const { status } = await mobilelocker.crm.refresh({ mode: 'full' })
     */
    async refresh(options?: { mode?: CRMRefreshMode }): Promise<CRMRefreshResult> {
        try {
            const { data } = await apiClient.post<{ status: CRMRefreshStatus }>(getEndpoint('/crm/refresh'), { mode: options?.mode ?? 'incremental' })
            return withStatusBooleans(data, REFRESH_STATUSES)
        } catch (err) { throw mapToCRMError(err) }
    },

    /**
     * Execute a SOQL query against the connected CRM.
     *
     * Prefer this over full offline walks when you need filtered CRM data.
     *
     * @param soql - A valid SOQL SELECT statement.
     * @param parameters - Optional named bind parameters referenced in the SOQL string.
     * @returns A {@link CRMQueryResult} containing `rows`, `totalSize`, and `done`.
     * @throws {@link MobileLockerCRMError} with code `SOQLInvalid` on a syntax error, or on network/auth failure.
     *
     * @example
     * const result = await mobilelocker.crm.query('SELECT Id, Name FROM Account WHERE Name = :name', { name: 'Acme' })
     */
    async query(soql: string, parameters?: Record<string, unknown>): Promise<CRMQueryResult> {
        try {
            const { data } = await withRetry(() =>
                apiClient.post<CRMQueryResult>(getEndpoint('/crm/query'), { soql, parameters }),
            )
            return data
        } catch (err) { throw mapToCRMError(err) }
    },
}
