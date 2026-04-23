import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { Event } from '../types/event'
import type { Attendee } from '../types/attendee'
import type { BusinessCard } from '../types/businessCard'
import axios from 'axios'

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

export const congresses = {
    async list(): Promise<Event[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Event[]>(getEndpoint('/leadretrieval/events')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    async get(eventID: number): Promise<Event> {
        try {
            const { data } = await withRetry(() => apiClient.get<Event>(getEndpoint(`/leadretrieval/events/${eventID}`)))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    async getAttendees(eventID: number): Promise<Attendee[]> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Attendee[]>(getEndpoint(`/leadretrieval/events/${eventID}/attendees`)),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    async getBusinessCards(): Promise<BusinessCard[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<BusinessCard[]>(getEndpoint('/cards')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },
}
