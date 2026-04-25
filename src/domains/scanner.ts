import { apiClient, getEndpoint, isIOS, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { Attendee } from '../types/attendee'
import type { BusinessCard } from '../types/businessCard'

export type ScanStatus = 'success' | 'cancelled' | 'failed'

export type ScanResult =
    | { status: 'success'; attendee: Attendee }
    | { status: 'success'; businessCard: BusinessCard }
    | { status: 'cancelled' }
    | { status: 'failed'; error: string }

export const scanner = {
    /**
     * Open the native business card scanner and capture a contact.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @param eventID - Optional lead retrieval event ID to associate the scan with.
     * @returns A {@link ScanResult} — check `status` before accessing `businessCard`.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     *
     * @example
     * const result = await mobilelocker.scanner.scanBusinessCard()
     * if (result.status === 'success') console.log(result.businessCard)
     */
    async scanBusinessCard(eventID?: number): Promise<ScanResult> {
        if (!isIOS()) {
            throw new MobileLockerError('scanBusinessCard() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        const { data } = await withRetry(() =>
            apiClient.post<ScanResult>(getEndpoint('/open-scanner'), eventID !== undefined ? { event_id: eventID } : {}),
        )
        return data
    },

    /**
     * Open the native badge scanner and capture an event attendee.
     *
     * @remarks iOS app only. Throws in all other environments.
     * @param eventID - The lead retrieval event ID to associate the scan with.
     * @returns A {@link ScanResult} — check `status` before accessing `attendee`.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     *
     * @example
     * const result = await mobilelocker.scanner.scanBadge(eventID)
     * if (result.status === 'success') console.log(result.attendee)
     */
    async scanBadge(eventID: number): Promise<ScanResult> {
        if (!isIOS()) {
            throw new MobileLockerError('scanBadge() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        const { data } = await withRetry(() =>
            apiClient.post<ScanResult>(getEndpoint('/leadretrieval/open-badge-scanner'), { event_id: eventID }),
        )
        return data
    },
}
