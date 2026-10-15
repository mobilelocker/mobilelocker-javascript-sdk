import { apiClient, getEndpoint, isIOS } from '../env'
import { unsupportedEnvironmentError } from '../errors'
import type { Attendee } from '../types/attendee'
import { withStatusBooleans, WithStatusBooleans } from '../utils/status'

export type ScanStatus = 'success' | 'cancelled' | 'failed'

const SCAN_STATUSES = ['success', 'cancelled', 'failed'] as const

/**
 * Native scanner UI is user-driven and may stay open for minutes.
 * - timeout: 0 — no axios limit (global apiClient default is 30s).
 * - No withRetry — a retry would open a second native scanner session.
 */
const SCANNER_REQUEST_CONFIG = { timeout: 0 } as const

export type RawScanResult =
    | { status: 'success'; attendee: Attendee }
    | { status: 'cancelled' }
    | { status: 'failed'; error: string }

export type ScanResult = WithStatusBooleans<RawScanResult>

/** @category Device */
export const scanner = {
    /**
     * Open the native badge scanner and capture an event attendee.
     *
     * @remarks iOS app only. Throws in all other environments.
     * Long-lived host bridge: per-request `timeout: 0`, no automatic retry.
     * @param eventID - The lead retrieval event ID to associate the scan with.
     * @returns A {@link ScanResult} — check `isSuccess` before accessing `attendee`.
     * @throws {@link MobileLockerError} if called outside the iOS app.
     *
     * @example
     * const result = await mobilelocker.scanner.scanBadge(eventID)
     * if (result.isSuccess) console.log(result.attendee)
     */
    async scanBadge(eventID: number): Promise<ScanResult> {
        if (!isIOS()) {
            throw unsupportedEnvironmentError('scanBadge()')
        }
        const { data } = await apiClient.post<ScanResult>(
            getEndpoint('/leadretrieval/open-badge-scanner'),
            { event_id: eventID },
            SCANNER_REQUEST_CONFIG,
        )
        return withStatusBooleans(data as RawScanResult, SCAN_STATUSES)
    },
}
