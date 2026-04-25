import { apiClient, getEndpoint, isApp } from '../env'
import { MobileLockerHTTPError, MobileLockerHttpResponseError, HTTPErrorCode } from '../errors'

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type HTTPResponseType = 'json' | 'text' | 'blob'

export interface HTTPOptions {
    /** Additional request headers. */
    headers?: Record<string, string>
    /** Request timeout in milliseconds. Defaults to `30000`. */
    timeout?: number
    /** Expected response format. Defaults to `'json'`. */
    responseType?: HTTPResponseType
}

export interface HTTPRequestOptions extends HTTPOptions {
    method?: HTTPMethod
    body?: unknown
}

export interface HTTPResponse {
    /** HTTP status code. */
    status: number
    /** HTTP status text. */
    statusText: string
    /** Response headers as a flat key/value map. */
    headers: Record<string, string>
    /** Parsed response body. Type depends on `responseType`. */
    data: unknown
}

async function request(url: string, options: HTTPRequestOptions = {}): Promise<HTTPResponse> {
    const method = options.method ?? 'GET'
    const timeout = options.timeout ?? 30_000
    const responseType = options.responseType ?? 'json'

    if (isApp()) {
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
    /**
     * Make a GET request to an external URL.
     *
     * In the iOS app, requests are proxied through the native layer to bypass CORS.
     * In the browser, standard `fetch` is used and CORS rules apply.
     *
     * @param url - The full URL to request.
     * @param options - Optional headers, timeout, and response type.
     * @returns An {@link HTTPResponse} with `status`, `statusText`, `headers`, and `data`.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    async get(url: string, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'GET' })
    },

    /**
     * Make a POST request to an external URL.
     *
     * @param url - The full URL to request.
     * @param body - Request body, serialized as JSON.
     * @param options - Optional headers, timeout, and response type.
     * @returns An {@link HTTPResponse}.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    async post(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'POST', body })
    },

    /**
     * Make a PUT request to an external URL.
     *
     * @param url - The full URL to request.
     * @param body - Request body, serialized as JSON.
     * @param options - Optional headers, timeout, and response type.
     * @returns An {@link HTTPResponse}.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    async put(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'PUT', body })
    },

    /**
     * Make a PATCH request to an external URL.
     *
     * @param url - The full URL to request.
     * @param body - Request body, serialized as JSON.
     * @param options - Optional headers, timeout, and response type.
     * @returns An {@link HTTPResponse}.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    async patch(url: string, body?: unknown, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'PATCH', body })
    },

    /**
     * Make a DELETE request to an external URL.
     *
     * @param url - The full URL to request.
     * @param options - Optional headers, timeout, and response type.
     * @returns An {@link HTTPResponse}.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    async delete(url: string, options?: HTTPOptions): Promise<HTTPResponse> {
        return request(url, { ...options, method: 'DELETE' })
    },

    /**
     * Make an HTTP request with full control over method and options.
     *
     * @param url - The full URL to request.
     * @param options - Method, body, headers, timeout, and response type.
     * @returns An {@link HTTPResponse}.
     * @throws {@link MobileLockerHTTPError} on network failure or timeout.
     * @throws {@link MobileLockerHttpResponseError} on non-2xx responses.
     */
    request,
}
