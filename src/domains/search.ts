import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { Presentation } from '../types/presentation'
import type { Customer } from '../types/customer'
import type { UserContact } from '../types/userContact'
import type { Attendee } from '../types/attendee'
import type { BusinessCard } from '../types/businessCard'
import axios from 'axios'

export type SearchEntityType = 'presentations' | 'customers' | 'contacts' | 'attendees' | 'business_cards'

export interface SearchOptions {
    /** Limit results to specific entity types. Defaults to all types. */
    types?: SearchEntityType[]
    /** Maximum number of results per entity type. Defaults to `5`. */
    limit?: number
}

export interface SearchResults {
    presentations:  { results: Presentation[]; total_count: number }
    customers:      { results: Customer[];     total_count: number }
    contacts:       { results: UserContact[];  total_count: number }
    attendees:      { results: (Attendee & { event_name: string })[]; total_count: number }
    business_cards: { results: BusinessCard[]; total_count: number }
}

export const search = {
    /**
     * Search across multiple entity types simultaneously.
     *
     * Returns results grouped by type. Use `options.types` to restrict the search
     * to specific entities and `options.limit` to control result set size per type.
     *
     * @param text - The search string.
     * @param options - Optional filter for entity types and result limit.
     * @returns A {@link SearchResults} object with a result set for each entity type.
     * @throws {@link MobileLockerError} on network failure or server error.
     *
     * @example
     * const results = await mobilelocker.search.query('Acme', { types: ['customers'], limit: 10 })
     * results.customers.results.forEach(c => console.log(c.name))
     */
    async query(text: string, options: SearchOptions = {}): Promise<SearchResults> {
        try {
            const { data } = await withRetry(() =>
                apiClient.get<SearchResults>(getEndpoint('/search'), {
                    params: {
                        q: text,
                        types: options.types?.join(','),
                        limit: options.limit ?? 5,
                    },
                }),
            )
            return data
        } catch (err) {
            if (err instanceof MobileLockerError) throw err
            if (axios.isAxiosError(err) && !err.response) {
                throw new MobileLockerError('No internet connection', GeneralErrorCode.NotConnected)
            }
            throw new MobileLockerError(String(err), GeneralErrorCode.ServerError)
        }
    },
}
