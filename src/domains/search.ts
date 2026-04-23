import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import type { Presentation } from '../types/presentation'
import type { Customer } from '../types/customer'
import type { UserContact } from '../types/userContact'
import type { Attendee } from '../types/attendee'
import type { BusinessCard } from '../types/businessCard'
import axios from 'axios'

export type SearchEntityType = 'presentations' | 'customers' | 'contacts' | 'attendees' | 'businessCards'

export interface SearchOptions {
    types?: SearchEntityType[]
    limit?: number
}

export interface SearchResults {
    presentations: { results: Presentation[]; totalCount: number }
    customers:     { results: Customer[];     totalCount: number }
    contacts:      { results: UserContact[];  totalCount: number }
    attendees:     { results: (Attendee & { eventName: string })[]; totalCount: number }
    businessCards: { results: BusinessCard[]; totalCount: number }
}

export const search = {
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
