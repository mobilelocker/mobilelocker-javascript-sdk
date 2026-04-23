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
    async getAccounts(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/accounts')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getAddresses(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/addresses')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getContacts(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/contacts')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getUsers(): Promise<unknown> {
        try {
            const { data } = await withRetry(() => apiClient.get<unknown>(getEndpoint('/crm/users')))
            return data
        } catch (err) { throw toError(err) }
    },

    async openCustomerPicker(): Promise<{ status: PickerStatus; customers?: Customer[] }> {
        if (!isMobileLockerIOSApp()) {
            throw new MobileLockerError('openCustomerPicker() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        try {
            const { data } = await withRetry(() => apiClient.post<{ status: PickerStatus; customers?: Customer[] }>(getEndpoint('/open-customer-picker')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getCurrentCustomers(): Promise<Customer[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer[]>(getEndpoint('/crm/customers/current')))
            return data
        } catch (err) { throw toError(err) }
    },

    async getRecentCustomers(): Promise<Customer[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer[]>(getEndpoint('/crm/customers/recent')))
            return data
        } catch (err) { throw toError(err) }
    },

    async isCurrentCustomer(objectID: string): Promise<boolean> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<{ isCurrent: boolean }>(getEndpoint('/crm/customers/is-current'), { params: { objectID } }),
            )
            return data.isCurrent
        } catch (err) { throw toError(err) }
    },

    async setCurrentCustomers(customerIDs: string[]): Promise<void> {
        try {
            await withRetry(() => apiClient.post(getEndpoint('/crm/customers/current'), { customerIDs }))
        } catch (err) { throw toError(err) }
    },

    async addCurrentCustomer(customerID: string): Promise<void> {
        try {
            await withRetry(() => apiClient.put(getEndpoint('/crm/customers/current/add'), { customerID }))
        } catch (err) { throw toError(err) }
    },

    async removeCurrentCustomer(customerID: string): Promise<void> {
        try {
            await withRetry(() => apiClient.put(getEndpoint('/crm/customers/current/remove'), { customerID }))
        } catch (err) { throw toError(err) }
    },

    async clearCurrentCustomers(): Promise<void> {
        try {
            await withRetry(() => apiClient.delete(getEndpoint('/crm/customers/current')))
        } catch (err) { throw toError(err) }
    },

    async refresh(options?: { mode?: CRMRefreshMode }): Promise<{ status: CRMRefreshStatus }> {
        try {
            const { data } = await apiClient.post<{ status: CRMRefreshStatus }>(getEndpoint('/crm/refresh'), { mode: options?.mode ?? 'incremental' })
            return data
        } catch (err) { throw toError(err) }
    },

    async query(soql: string, parameters?: Record<string, unknown>): Promise<CRMQueryResult> {
        try {
            const { data } = await withRetry(() =>
                apiClient.post<CRMQueryResult>(getEndpoint('/crm/query'), { soql, parameters }),
            )
            return data
        } catch (err) { throw toError(err) }
    },
}
