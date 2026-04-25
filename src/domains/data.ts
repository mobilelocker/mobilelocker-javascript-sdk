import { analytics } from './analytics'

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
}
