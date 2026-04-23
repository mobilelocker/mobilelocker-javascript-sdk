import { analytics } from './analytics'

export const data = {
    submitForm(formName: string, formInput: Record<string, unknown>): void {
        analytics.logEvent('data-capture', formName, formName, formInput, 'capturedata')
    },
}
