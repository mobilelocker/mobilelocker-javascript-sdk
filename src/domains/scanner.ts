import { apiClient, getEndpoint, isMobileLockerIOSApp, withRetry } from '../env'
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
    async scanBusinessCard(eventID?: number): Promise<ScanResult> {
        if (!isMobileLockerIOSApp()) {
            throw new MobileLockerError('scanBusinessCard() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        const { data } = await withRetry(() =>
            apiClient.post<ScanResult>(getEndpoint('/open-scanner'), eventID !== undefined ? { event_id: eventID } : {}),
        )
        return data
    },

    async scanBadge(eventID: number): Promise<ScanResult> {
        if (!isMobileLockerIOSApp()) {
            throw new MobileLockerError('scanBadge() is only supported in the iOS app', GeneralErrorCode.ServerError)
        }
        const { data } = await withRetry(() =>
            apiClient.post<ScanResult>(getEndpoint('/leadretrieval/open-badge-scanner'), { event_id: eventID }),
        )
        return data
    },
}
