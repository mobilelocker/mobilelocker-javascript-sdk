import { apiClient, getEndpoint, isIOS, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import axios from 'axios'

export type PermissionStatus =
    | 'authorized' | 'authorized_always' | 'authorized_when_in_use'
    | 'denied' | 'restricted' | 'not_determined' | 'limited' | 'unknown'

export type BiometricType = 'face_id' | 'touch_id' | 'optic_id' | 'none' | 'unknown'

export interface PermissionResult {
    status: PermissionStatus
    granted: boolean
}

export interface BiometricResult {
    available: boolean
    biometric_type: BiometricType
    error: string | null
}

const NOT_DETERMINED: PermissionResult = { status: 'not_determined', granted: false }
const BIOMETRIC_UNAVAILABLE: BiometricResult = { available: false, biometric_type: 'unknown', error: null }

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

export const permissions = {
    /**
     * Check camera permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async camera(): Promise<PermissionResult> {
        if (!isIOS()) return NOT_DETERMINED
        try {
            const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint('/permissions/camera')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Check microphone permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async microphone(): Promise<PermissionResult> {
        if (!isIOS()) return NOT_DETERMINED
        try {
            const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint('/permissions/microphone')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Check photo library permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async photoLibrary(): Promise<PermissionResult> {
        if (!isIOS()) return NOT_DETERMINED
        try {
            const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint('/permissions/photo-library')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Check location permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async location(): Promise<PermissionResult> {
        if (!isIOS()) return NOT_DETERMINED
        try {
            const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint('/permissions/location')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Check Bluetooth permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async bluetooth(): Promise<PermissionResult> {
        if (!isIOS()) return NOT_DETERMINED
        try {
            const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint('/permissions/bluetooth')))
            return data
        } catch (err) { throw toError(err) }
    },

    /**
     * Check biometric authentication availability.
     *
     * @returns `{ available, biometric_type, error }` inside the iOS app; `{ available: false, biometric_type: 'unknown', error: null }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async biometric(): Promise<BiometricResult> {
        if (!isIOS()) return BIOMETRIC_UNAVAILABLE
        try {
            const { data } = await withRetry(() => apiClient.get<BiometricResult>(getEndpoint('/permissions/biometric')))
            return data
        } catch (err) { throw toError(err) }
    },
}
