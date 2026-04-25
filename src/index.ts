import { isMobileLocker, isMobileLockerApp, isMobileLockerCDN, isMobileLockerIOSApp } from './env'

import { analytics } from './domains/analytics'
import { congresses } from './domains/congresses'
import { contacts } from './domains/contacts'
import { crm } from './domains/crm'
import { data } from './domains/data'
import { database } from './domains/database'
import { log } from './domains/log'
import { device } from './domains/device'
import { http } from './domains/http'
import { network } from './domains/network'
import { presentation } from './domains/presentation'
import { scanner } from './domains/scanner'
import { search } from './domains/search'
import { session } from './domains/session'
import { share } from './domains/share'
import { storage } from './domains/storage'
import { ui } from './domains/ui'
import { user } from './domains/user'
import { MobileLockerError } from './errors'

const notificationLevels = {
    NOTIFY_NONE:    0,
    NOTIFY_FIRST:   1,
    NOTIFY_EVERY:   2,
    NOTIFY_WEEKLY:  3,
    NOTIFY_MONTHLY: 4,
}

const mobilelocker = {
    // Top-level environment detection
    isMobileLocker,
    isMobileLockerApp,
    isMobileLockerCDN,
    isMobileLockerIOSApp,

    // Top-level error class
    MobileLockerError,

    // Notification level constants
    notificationLevels,

    // Domains
    analytics,
    congresses,
    contacts,
    crm,
    data,
    database,
    log,
    device,
    http,
    network,
    presentation,
    scanner,
    search,
    session,
    share,
    storage,
    ui,
    user,
}

export default mobilelocker

// Named exports for TypeScript consumers
export { isMobileLocker, isMobileLockerApp, isMobileLockerCDN, isMobileLockerIOSApp }
export { MobileLockerError } from './errors'
export { MobileLockerCRMError, MobileLockerDatabaseError, MobileLockerHTTPError, MobileLockerHttpResponseError } from './errors'
export { GeneralErrorCode, CRMErrorCode, DatabaseErrorCode, HTTPErrorCode } from './errors'

// Domain types
export type { StorageEntry, StorageFilter } from './domains/storage'
export type { SDKLogEntry, SDKLogFilter, SDKLogLevel, SDKLogDomain } from './domains/log'
export type { CRMRefreshMode, CRMRefreshStatus, PickerStatus, CRMQueryResult } from './domains/crm'
export type { DownloadStatus } from './domains/presentation'
export type { ScanStatus, ScanResult } from './domains/scanner'
export type { SearchEntityType, SearchOptions, SearchResults } from './domains/search'
export type { NetworkStatus, NetworkConnectionType } from './domains/network'
export type { DeviceInfo, AppEnvironment } from './domains/device'
export type { HTTPMethod, HTTPResponseType, HTTPOptions, HTTPRequestOptions, HTTPResponse } from './domains/http'
export type { VideoOptions, VideoResult } from './domains/ui'
export type { ShareRecipient } from './domains/share'
export type { User } from './domains/user'

// DTO types
export type { Presentation } from './types/presentation'
export type { Customer } from './types/customer'
export type { Attendee } from './types/attendee'
export type { Event } from './types/event'
export type { BusinessCard } from './types/businessCard'
export type { UserContact } from './types/userContact'
export type { Brand } from './types/brand'
export type { Folder } from './types/folder'
export type { Label } from './types/label'
export type { DatabaseQueryResult, DatabaseColumnInfo, DatabaseTableDescription } from './types/database'
