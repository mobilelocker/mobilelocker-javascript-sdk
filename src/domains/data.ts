import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { analytics } from './analytics'
import type { Product } from '../types/product'
import type { Folder } from '../types/folder'
import type { Label } from '../types/label'
import type { Customer } from '../types/customer'
import axios from 'axios'

function toError(err: unknown): MobileLockerError {
    if (err instanceof MobileLockerError) return err
    if (axios.isAxiosError(err) && !err.response) {
        return new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
    }
    return new MobileLockerError(
        axios.isAxiosError(err) ? ((err.response?.data as { message?: string })?.message ?? err.message) : String(err),
        GeneralErrorCode.ServerError,
    )
}

export const data = {
    /**
     * Submit a data capture form event.
     *
     * Records the form submission in the Mobile Locker analytics pipeline under
     * the `'data-capture'` category. Use this to track lead forms, survey responses,
     * or any structured input the user submits during a presentation.
     *
     * @param formName - Identifier for the form (e.g. `'lead-form'`, `'product-interest'`).
     * @param formInput - Key/value pairs representing the form fields and their values.
     *
     * @example
     * mobilelocker.data.submitForm('lead-form', { firstName: 'Jane', email: 'jane@example.com' })
     */
    submitForm(formName: string, formInput: Record<string, unknown>): void {
        analytics.logEvent('data-capture', formName, formName, formInput, 'capturedata')
    },

    // ─── Products ────────────────────────────────────────────────────────────

    /**
     * Get all products available to the current team.
     *
     * @returns Array of {@link Product} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getProducts(): Promise<Product[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Product[]>(getEndpoint('/products')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a specific product by ID.
     *
     * @param id - The numeric product ID.
     * @returns The matching {@link Product}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getProduct(id: number): Promise<Product> {
        try {
            const { data } = await withRetry(() => apiClient.get<Product>(getEndpoint(`/products/${id}`)))
            return data
        } catch (err) { throw toError(err) }
    },

    // ─── Labels ───────────────────────────────────────────────────────────────

    /**
     * Get all labels available to the current team.
     *
     * @returns Array of {@link Label} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getLabels(): Promise<Label[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Label[]>(getEndpoint('/labels')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a specific label by ID.
     *
     * @param id - The numeric label ID.
     * @returns The matching {@link Label}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getLabel(id: number): Promise<Label> {
        try {
            const { data } = await withRetry(() => apiClient.get<Label>(getEndpoint(`/labels/${id}`)))
            return data
        } catch (err) { throw toError(err) }
    },

    // ─── Folders ──────────────────────────────────────────────────────────────

    /**
     * Get all folders in the current user's library.
     *
     * @returns Array of {@link Folder} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getFolders(): Promise<Folder[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Folder[]>(getEndpoint('/folders')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a specific folder by ID.
     *
     * @param id - The numeric folder ID.
     * @returns The matching {@link Folder}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getFolder(id: number): Promise<Folder> {
        try {
            const { data } = await withRetry(() => apiClient.get<Folder>(getEndpoint(`/folders/${id}`)))
            return data
        } catch (err) { throw toError(err) }
    },

    // ─── Customers ────────────────────────────────────────────────────────────

    /**
     * Get all customers synced for the current user.
     *
     * @returns Array of {@link Customer} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getCustomers(): Promise<Customer[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer[]>(getEndpoint('/customers')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Get a specific customer by their CRM object ID.
     *
     * @param id - The CRM object ID (e.g. a Salesforce 18-char ID).
     * @returns The matching {@link Customer}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getCustomer(id: string): Promise<Customer> {
        try {
            const { data } = await withRetry(() => apiClient.get<Customer>(getEndpoint(`/customers/${id}`)))
            return data
        } catch (err) { throw toError(err) }
    },
}
