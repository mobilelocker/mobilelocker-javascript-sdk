import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

/** Build an AxiosError with optional HTTP response (omit response for network failure). */
export function makeAxiosError(
    message: string,
    options?: {
        status?: number
        data?: unknown
        statusText?: string
    },
): AxiosError {
    const err = new AxiosError(message)
    if (options?.status !== undefined) {
        err.response = {
            status: options.status,
            statusText: options.statusText ?? 'Error',
            data: options.data ?? {},
            headers: {},
            config: {} as InternalAxiosRequestConfig,
        } satisfies AxiosResponse
    }
    return err
}
