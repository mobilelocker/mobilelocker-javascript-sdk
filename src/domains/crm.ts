import { apiClient, getEndpoint, isMobileLockerIOSApp, withRetry } from '../env'
import { MobileLockerCRMError, MobileLockerError, CRMErrorCode, GeneralErrorCode } from '../errors'
import type { Customer } from '../types/customer'
import axios from 'axios'

export type CRMRefreshMode = 'incremental' | 'full'
export type CRMRefreshStatus = 'started' | 'not_connected'
export type PickerStatus = 'selected' | 'cancelled'

export interface CRMQueryResult {
    rows: Record<string, unknown>[]
    totalSize: number
    done: boolean
}

function toError(err: unknown): MobileLockerCRMError {
    if (err instanceof MobileLockerCRMError) return err
    if (axios.isAxiosError(err)) {
        if (!err.response) return new MobileLockerCRMError('No internet connection', CRMErrorCode.NotConnected)
        const status = err.response.status
        const msg = (err.response.data as { message?: string })?.message ?? err.message
        if (status === 401 || status === 403) return new MobileLockerCRMError('CRM session expired', CRMErrorCode.AuthExpired)
        if (status === 400) return new MobileLockerCRMError(msg, CRMErrorCode.SOQLInvalid, msg)
        return new MobileLockerCRMError(msg, CRMErrorCode.ServerError)
    }
    return new MobileLockerCRMError(String(err), CRMErrorCode.ServerError)
}

export const crm = {
    /**
     * Get all CRM accounts synced for the current user.
     *
     * @returns Raw account records from the connected CRM.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getAccounts(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/accounts')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get all CRM addresses synced for the current user.
     *
     * @returns Raw address records from the connected CRM.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getAddresses(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/addresses')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get all CRM contacts synced for the current user.
     *
     * @returns Raw contact records from the connected CRM.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getContacts(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/contacts')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get all CRM users synced for the current team.
     *
     * @returns Raw user records from the connected CRM.
     * @throws {@link MobileLockerCRMError} on network failure, auth expiry, or server error.
     */
    async getUsers(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/users')))
            return data
        } catch (err) { throw toError(err) }
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
    async openCustomerPicker(): Promise<{ status: PickerStatus; customers?: Customer[] }> {
        if (!isMobileLockerIOSApp()) {
            throw new MobileLockerError('openCustomerPicker() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        try {
            const { data } = await withRetry(() => apiClient.post<{ status: PickerStatus; customers?: Customer[] }>(getEndpoint('/open-customer-picker')))
            return data
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
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
        } catch (err) { throw toError(err) }
    },

    /**
     * Remove all customers from the current session.
     *
     * @throws {@link MobileLockerCRMError} on network failure or server error.
     */
    async clearCurrentCustomers(): Promise<void> {
        try {
            await withRetry(() => apiClient.delete(getEndpoint('/crm/customers/current')))
        } catch (err) { throw toError(err) }
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
    async refresh(options?: { mode?: CRMRefreshMode }): Promise<{ status: CRMRefreshStatus }> {
        try {
            const { data } = await apiClient.post<{ status: CRMRefreshStatus }>(getEndpoint('/crm/refresh'), { mode: options?.mode ?? 'incremental' })
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Execute a SOQL query against the connected CRM.
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
        } catch (err) { throw toError(err) }
    },
}
