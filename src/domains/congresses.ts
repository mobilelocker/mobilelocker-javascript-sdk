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
    /**
     * List all lead retrieval events available to the current user.
     *
     * @returns Array of {@link Event} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async list(): Promise<Event[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<Event[]>(getEndpoint('/leadretrieval/events')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get a single lead retrieval event by ID.
     *
     * @param eventID - The numeric ID of the event.
     * @returns The matching {@link Event}.
     * @throws {@link MobileLockerError} on network failure or if the event is not found.
     */
    async get(eventID: number): Promise<Event> {
        try {
            const { data } = await withRetry(() => apiClient.get<Event>(getEndpoint(`/leadretrieval/events/${eventID}`)))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get all attendees for a lead retrieval event.
     *
     * @param eventID - The numeric ID of the event.
     * @returns Array of {@link Attendee} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
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

    /**
     * Get a specific attendee by ID.
     *
     * @param attendeeID - The attendee's string ID.
     * @returns The matching {@link Attendee}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getAttendee(attendeeID: string): Promise<Attendee> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<Attendee>(getEndpoint(`/leadretrieval/attendees/${attendeeID}`)),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get all business cards scanned by the current user.
     *
     * @returns Array of {@link BusinessCard} objects.
     * @throws {@link MobileLockerError} on network failure or server error.
     */
    async getBusinessCards(): Promise<BusinessCard[]> {
        try {
            const { data } = await withRetry(() => apiClient.get<BusinessCard[]>(getEndpoint('/cards')))
            return data
        } catch (err) {
            throw toError(err)
        }
    },

    /**
     * Get a specific business card by ID.
     *
     * @param cardID - The business card's string ID.
     * @returns The matching {@link BusinessCard}.
     * @throws {@link MobileLockerError} on network failure or if not found.
     */
    async getBusinessCard(cardID: string): Promise<BusinessCard> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<BusinessCard>(getEndpoint(`/cards/${cardID}`)),
            )
            return data
        } catch (err) {
            throw toError(err)
        }
    },
}
