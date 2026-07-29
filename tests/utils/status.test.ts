import { describe, expect, it } from 'vitest'
import { withStatusBooleans } from '../../src/utils/status'
import { EMAIL_DELIVERABILITY_STATUSES } from '../../src/types/userContact'

describe('withStatusBooleans', () => {
    it('sets the matching is* flag true and all others false', () => {
        const result = withStatusBooleans({ status: 'success' as const }, ['success', 'cancelled', 'failed'] as const)

        expect(result.status).toBe('success')
        expect(result.isSuccess).toBe(true)
        expect(result.isCancelled).toBe(false)
        expect(result.isFailed).toBe(false)
    })

    it('converts snake_case statuses to camelCase is* keys', () => {
        const result = withStatusBooleans(
            { status: 'not_connected' as const },
            ['started', 'not_connected'] as const,
        )

        expect(result.isNotConnected).toBe(true)
        expect(result.isStarted).toBe(false)
    })

    it('supports email deliverability statuses including TBD', () => {
        const valid = withStatusBooleans({ status: 'valid' as const }, EMAIL_DELIVERABILITY_STATUSES)
        expect(valid.isValid).toBe(true)
        expect(valid.isInvalid).toBe(false)
        expect(valid.isDisposable).toBe(false)

        const tbd = withStatusBooleans({ status: 'TBD' as const }, EMAIL_DELIVERABILITY_STATUSES)
        // TBD capitalisation: first letter uppercased after is → isTBD
        expect(tbd.isTBD).toBe(true)
        expect(tbd.isValid).toBe(false)
    })

    it('preserves additional fields on the source object', () => {
        const result = withStatusBooleans(
            { status: 'selected' as const, customers: [{ id: 1 }] },
            ['selected', 'cancelled'] as const,
        )

        expect(result.isSelected).toBe(true)
        expect(result.customers).toEqual([{ id: 1 }])
    })
})
