import { isMobileLocker } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { analytics } from './analytics'

export interface ShareRecipient {
    email: string
    name?: string
}

export const share = {
    presentation(
        recipients: ShareRecipient[],
        notificationLevel = 2,
        sendReminders = true,
    ): void {
        if (!Array.isArray(recipients) || recipients.length === 0) {
            throw new MobileLockerError('At least one recipient is required', GeneralErrorCode.ServerError)
        }
        for (const r of recipients) {
            if (!r.email) throw new MobileLockerError('Each recipient must have an email', GeneralErrorCode.ServerError)
        }
        if (!isMobileLocker()) return

        analytics.logEvent('share', 'share-presentation', '/share', {
            notification_level: notificationLevel,
            recipients,
            send_reminders: sendReminders,
            source: 'app',
        }, 'capturedata')
    },

    email(
        to: string | { name?: string; email: string },
        subject: string,
        body: string | null = null,
        attachment: string | null = null,
        template: string | null = null,
        formData: unknown = null,
    ): void {
        const recipient = typeof to === 'string'
            ? { name: null, email: to }
            : { name: to.name ?? null, email: to.email }

        analytics.logEvent('data-capture', 'email_form', 'email_form', {
            email: { recipient, subject, body, attachment, template },
            formData,
        }, 'capturedata')
    },
}
