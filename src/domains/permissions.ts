import { apiClient, getEndpoint, isIOS, withRetry } from '../env'
import { mapToMobileLockerError } from '../errors'

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

async function fetchPermission(path: string): Promise<PermissionResult> {
    if (!isIOS()) return NOT_DETERMINED
    try {
        const { data } = await withRetry(() => apiClient.get<PermissionResult>(getEndpoint(path)))
        return data
    } catch (err) {
        throw mapToMobileLockerError(err)
    }
}

/** @category Device */
export const permissions = {
    /**
     * Check camera permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async camera(): Promise<PermissionResult> {
        return fetchPermission('/permissions/camera')
    },

    /**
     * Check microphone permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async microphone(): Promise<PermissionResult> {
        return fetchPermission('/permissions/microphone')
    },

    /**
     * Check photo library permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async photoLibrary(): Promise<PermissionResult> {
        return fetchPermission('/permissions/photo-library')
    },

    /**
     * Check location permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async location(): Promise<PermissionResult> {
        return fetchPermission('/permissions/location')
    },

    /**
     * Check Bluetooth permission status.
     *
     * @returns `{ status, granted }` inside the iOS app; `{ status: 'not_determined', granted: false }` elsewhere.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async bluetooth(): Promise<PermissionResult> {
        return fetchPermission('/permissions/bluetooth')
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
        } catch (err) {
            throw mapToMobileLockerError(err)
        }
    },
}
