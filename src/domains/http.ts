import { apiClient, getEndpoint, isMobileLockerApp } from '../env'
import { MobileLockerHTTPError, MobileLockerHttpResponseError, HTTPErrorCode } from '../errors'

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type HTTPResponseType = 'json' | 'text' | 'blob'

export interface HTTPOptions {
    headers?: Record<string, string>
    timeout?: number
    responseType?: HTTPResponseType
}

export interface HTTPRequestOptions extends HTTPOptions {
    method?: HTTPMethod
    body?: unknown
}

export interface HTTPResponse {
    status: number
    statusText: string
    headers: Record<string, string>
    data: unknown
}

async function request(url: string, options: HTTPRequestOptions = {}): Promise<HTTPResponse> {
    const method = options.method ?? 'GET'
    const timeout = options.timeout ?? 30_000
    const responseType = options.responseType ?? 'json'

    if (isMobileLockerApp()) {
        // Proxy through iOS GCDWebServer — URLSession makes the real request (no CORS)
        const { data } = await apiClient.post<HTTPResponse>(getEndpoint('/http/request'), {
            url,
            method,
            headers: options.headers,
            body: options.body,
            timeout,
            responseType,
        })
        return data
    }

    // Browser: native fetch (CORS rules apply)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    let response: Response
    try {
        response = await fetch(url, {
            method,
            headers: options.headers,
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
            signal: controller.signal,
        })
    } catch (err) {
        clearTimeout(timer)
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new MobileLockerHTTPError('Request timeout', HTTPErrorCode.RequestTimeout)
        }
        if (!navigator.onLine) {
            throw new MobileLockerHTTPError('No internet connection', HTTPErrorCode.NotConnected)
        }
        throw new MobileLockerHTTPError((err as Error).message, HTTPErrorCode.ServerError)
    }
    clearTimeout(timer)

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, key) => { responseHeaders[key] = value })

    let responseData: unknown
    if (responseType === 'json') responseData = await response.json().catch(() => null)
    else if (responseType === 'blob') responseData = await response.blob()
    else responseData = await response.text()

    if (!response.ok) {
        throw new MobileLockerHttpResponseError(response.status, response.statusText, responseHeaders, responseData)
    }

    return { status: response.status, statusText: response.statusText, headers: responseHeaders, data: responseData }
}

export const http = {
    async get(url: string, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'GET' })
    },
    async post(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'POST', body })
    },
    async put(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'PUT', body })
    },
    async patch(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'PATCH', body })
    },
    async delete(url: string, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'DELETE' })
    },
    request,
}
