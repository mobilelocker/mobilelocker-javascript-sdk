import { apiClient, getEndpoint, withRetry } from '../env'
import { MobileLockerError, GeneralErrorCode } from '../errors'
import axios from 'axios'

export interface User {
    id: number
    name: string
    email: string
    teamID: number
    [key: string]: unknown
}

export const user = {
    async get(): Promise<User> {
        try {
            const { data } = await withRetry(() => apiClient.get<User>(getEndpoint('/user')))
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
