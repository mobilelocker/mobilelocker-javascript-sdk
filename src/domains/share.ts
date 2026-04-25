import { isMobileLocker } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import { analytics } from './analytics'

export interface ShareRecipient {
    /** Recipient email address. */
    email: string
    /** Optional display name for the recipient. */
    name?: string
}

export const share = {
    /**
     * Share the current presentation with one or more recipients.
     *
     * Sends the presentation link via the Mobile Locker platform. No-op outside
     * the Mobile Locker environment (e.g. local development).
     *
     * @param recipients - One or more recipients, each requiring at least an `email`.
     * @param notificationLevel - Controls when recipients receive email notifications.
     *   Use the `mobilelocker.notificationLevels` constants. Defaults to `NOTIFY_EVERY` (2).
     * @param sendReminders - Whether to send follow-up reminder emails. Defaults to `true`.
     * @throws {@link MobileLockerError} if `recipients` is empty or any recipient is missing an email.
     *
     * @example
     * mobilelocker.share.presentation(
     *   [{ email: 'jane@example.com', name: 'Jane' }],
     *   mobilelocker.notificationLevels.NOTIFY_FIRST,
     * )
     */
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

    /**
     * Send an email through the Mobile Locker platform.
     *
     * @param to - Recipient email string, or an object with `email` and optional `name`.
     * @param subject - Email subject line.
     * @param body - Optional email body text.
     * @param attachment - Optional path to a file to attach.
     * @param template - Optional email template identifier.
     * @param formData - Optional additional form data to include with the email record.
     *
     * @example
     * mobilelocker.share.email(
     *   { name: 'Jane', email: 'jane@example.com' },
     *   'Thanks for stopping by',
     *   'It was great meeting you at the conference.',
     * )
     */
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
