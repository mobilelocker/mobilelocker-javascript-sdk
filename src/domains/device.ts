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
    async get(): Promise<DeviceInfo | null> {
        if (!isMobileLockerIOSApp()) return null
        const { data } = await withRetry(() => apiClient.get<DeviceInfo>(getEndpoint('/device')))
        return data
    },

    async isAtLeastVersion(version: string): Promise<boolean> {
        if (!isMobileLockerIOSApp()) return false
        const info = await device.get()
        if (!info) return false
        return semverCompare(info.app.version, version) >= 0
    },
}
