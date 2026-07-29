import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEnvMock, resetEnvMock } from '../helpers/env-mock'
import type { DeviceInfo } from '../../src/domains/device'

const env = createEnvMock()
vi.mock('../../src/env', () => env)

const { device } = await import('../../src/domains/device')

const sampleInfo: DeviceInfo = {
    app: { name: 'Mobile Locker', version: '5.5.0', build: '100', environment: 'production' },
    os: { name: 'iOS', version: '18.0' },
    hardware: {
        model: 'iPad',
        name: 'iPad',
        isPhone: false,
        isPad: true,
        isSimulator: false,
        hasSensorHousing: false,
    },
    orientation: 'portrait',
    locale: { region: 'US' },
}

describe('device', () => {
    beforeEach(() => {
        resetEnvMock(env)
    })

    it('get returns null outside iOS/Android', async () => {
        await expect(device.get()).resolves.toBeNull()
        expect(env.apiClient.get).not.toHaveBeenCalled()
    })

    it('get fetches /device on iOS', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({ data: sampleInfo })
        await expect(device.get()).resolves.toEqual(sampleInfo)
        expect(env.apiClient.get).toHaveBeenCalledWith('/mobilelocker/api/device')
    })

    it('isAtLeastVersion returns false outside iOS/Android', async () => {
        await expect(device.isAtLeastVersion('5.0.0')).resolves.toBe(false)
    })

    it('isAtLeastVersion compares semver correctly', async () => {
        env.isIOS.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({ data: sampleInfo })

        await expect(device.isAtLeastVersion('5.5.0')).resolves.toBe(true)
        await expect(device.isAtLeastVersion('5.4.9')).resolves.toBe(true)
        await expect(device.isAtLeastVersion('5.5.1')).resolves.toBe(false)
        await expect(device.isAtLeastVersion('6.0.0')).resolves.toBe(false)
        await expect(device.isAtLeastVersion('5')).resolves.toBe(true)
    })

    it('works on Android as well as iOS', async () => {
        env.isAndroid.mockReturnValue(true)
        env.apiClient.get.mockResolvedValue({
            data: { ...sampleInfo, app: { ...sampleInfo.app, version: '2.1.0' } },
        })
        await expect(device.isAtLeastVersion('2.0.0')).resolves.toBe(true)
        await expect(device.isAtLeastVersion('2.2.0')).resolves.toBe(false)
    })
})
