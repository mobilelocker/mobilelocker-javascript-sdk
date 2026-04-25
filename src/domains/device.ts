import { apiClient, getEndpoint, isMobileLockerIOSApp, withRetry } from '../env'

export type AppEnvironment = 'production' | 'staging'

export interface DeviceInfo {
    app: {
        name: string
        version: string
        build: string
        environment: AppEnvironment
    }
    os: {
        name: string
        version: string
    }
    hardware: {
        model: string
        name: string
        isPhone: boolean
        isPad: boolean
        isSimulator: boolean
        hasSensorHousing: boolean
    }
    orientation: 'portrait' | 'landscape'
    locale: {
        region: string
    }
}

function semverCompare(a: string, b: string): number {
    const ap = a.split('.').map(Number)
    const bp = b.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
        const diff = (ap[i] ?? 0) - (bp[i] ?? 0)
        if (diff !== 0) return diff
    }
    return 0
}

export const device = {
    /**
     * Get hardware and app metadata for the current device.
     *
     * @remarks iOS app only. Returns `null` in all other environments.
     * @returns A {@link DeviceInfo} object, or `null` outside the iOS app.
     *
     * @example
     * const info = await mobilelocker.device.get()
     * if (info) console.log(info.app.version, info.hardware.model)
     */
    async get(): Promise<DeviceInfo | null> {
        if (!isMobileLockerIOSApp()) return null
        const { data } = await withRetry(() => apiClient.get<DeviceInfo>(getEndpoint('/device')))
        return data
    },

    /**
     * Check whether the Mobile Locker app version meets a minimum requirement.
     *
     * @remarks iOS app only. Returns `false` in all other environments.
     * @param version - Minimum required version string in `major.minor.patch` format (e.g. `'5.2.0'`).
     * @returns `true` if the current app version is equal to or greater than `version`.
     *
     * @example
     * if (await mobilelocker.device.isAtLeastVersion('5.2.0')) {
     *   // use a feature introduced in 5.2.0
     * }
     */
    async isAtLeastVersion(version: string): Promise<boolean> {
        if (!isMobileLockerIOSApp()) return false
        const info = await device.get()
        if (!info) return false
        return semverCompare(info.app.version, version) >= 0
    },
}
