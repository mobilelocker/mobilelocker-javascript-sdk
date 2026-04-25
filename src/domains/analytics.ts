import { apiClient, getEndpoint, isMobileLocker, isMobileLockerApp, userID, jwt, fallbackSessionId, fallbackSessionStartedAt } from '../env'
import localforage from 'localforage'
import { v4 as uuidv4 } from 'uuid'
import { MobileLockerError, GeneralErrorCode } from '../errors'

const DEFAULT_METHOD = 'trackevent'

async function _postEvent(
    category: string,
    action: string,
    uri: string,
    data: unknown,
    method: string,
): Promise<void> {
    if (!isMobileLocker()) {
        await _saveToLocalforage(method, category, action, uri, data)
        return
    }

    const now = Date.now()
    const event = { method, category, action, uri, path: uri, data }

    if (isMobileLockerApp()) {
        await apiClient.post(getEndpoint(), event)
    } else if (userID) {
        await apiClient.post(getEndpoint('/device-events'), {
            ...event,
            id: uuidv4(),
            session_id: jwt?.payload?.session_uuid,
            session_started_at: jwt?.payload?.session_started_at,
            event_at: Math.floor(now / 1000),
            event_at_ms: now,
        })
    } else {
        await apiClient.post(getEndpoint('/events'), { ...event, event_at_ms: now })
    }
}

async function _saveToLocalforage(
    method: string,
    category: string,
    action: string,
    uri: string,
    data: unknown,
): Promise<void> {
    const now = Date.now()
    const event = {
        id: uuidv4(),
        method,
        category,
        action,
        uri,
        path: uri,
        data,
        session_id: fallbackSessionId,
        session_started_at: fallbackSessionStartedAt,
        event_at: Math.floor(now / 1000),
        event_at_ms: now,
        timestamp: new Date().toISOString(),
    }
    const existing = (await localforage.getItem<unknown[]>('deviceEvents')) ?? []
    await localforage.setItem('deviceEvents', [...existing, event])
}

export const analytics = {
    /**
     * Track a custom analytics event.
     *
     * @param category - Event category (e.g. `'data-capture'`, `'share'`).
     * @param action - Event action (e.g. `'submit'`, `'open'`).
     * @param uri - The URI or name that identifies the subject of the event.
     * @param data - Optional payload attached to the event.
     * @param method - Internal tracking method; defaults to `'trackevent'`.
     *
     * @example
     * mobilelocker.analytics.logEvent('product', 'view', '/slides/overview', { productId: 42 })
     */
    logEvent(
        category: string,
        action: string,
        uri: string,
        data?: unknown,
        method = DEFAULT_METHOD,
    ): void {
        void _postEvent(category, action, uri, data, method)
    },

    /** @internal */
    _post: _postEvent,
}

/** @internal */
export async function getLocalforageEvents(): Promise<unknown[]> {
    if (isMobileLocker()) {
        throw new MobileLockerError(
            'getLocalforageEvents() is only available outside the Mobile Locker app',
            GeneralErrorCode.ServerError,
        )
    }
    return (await localforage.getItem<unknown[]>('deviceEvents')) ?? []
}
