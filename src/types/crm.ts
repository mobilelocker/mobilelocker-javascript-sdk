/**
 * CRM account record from the connected CRM.
 * Mirrors the iOS `GRDBAccount.toJSON()` output.
 */
export interface CRMAccount {
    id: string
    is_active: boolean
    is_person_account: boolean
    salutation: string
    name: string
    slug: string
    account_type: string
    crm_object: string
    /** Alias for `crm_object`. */
    object: string
    primary_account_id: string
    primary_account_name: string
    updated_at: string | null
    /** Provider-specific payload when present. */
    raw: unknown
}

/**
 * CRM address record from the connected CRM.
 * Mirrors the iOS `GRDBAddress.toJSON()` output.
 */
export interface CRMAddress {
    id: string
    account_id: string
    source: string
    full: string
    slug: string
    line_1: string
    line_2: string
    city: string
    state: string
    zip_code: string
    country: string
    phone: string
    phone_2: string
    fax: string
    fax_2: string
    is_billing: boolean
    is_business: boolean
    is_home: boolean
    is_inactive: boolean
    is_primary: boolean
    updated_at: string | null
}

/**
 * CRM contact record from the connected CRM.
 * Mirrors the iOS `GRDBContact.toJSON()` output.
 */
export interface CRMContact {
    id: string
    is_active: boolean
    is_person_account: boolean
    salutation: string
    name: string
    slug: string
    email: string
    account_id: string
    account_name: string
    owner_id: string
    crm_object: string
    /** Alias for `crm_object`. */
    object: string
    updated_at: string | null
    raw_string?: string
    raw?: unknown
}

/**
 * CRM lead record from the connected CRM.
 * Mirrors the iOS `GRDBLead.toJSON()` output.
 */
export interface CRMLead {
    id: string
    crm_object: string
    first_name: string
    last_name: string
    name: string
    company: string
    email: string
    phone: string
    owner_id: string
    lead_source: string
    converted_account_id: string
    converted_opportunity_id: string
    updated_at: string | null
}

/**
 * CRM user record for the connected team.
 * Mirrors the iOS `GRDBCRMUser.toJSON()` output.
 */
export interface CRMUser {
    id: string
    is_active: boolean
    name: string
    slug: string
    first_name: string
    last_name: string
    email: string
    username: string
    phone: string
    title: string
    company_name: string
    profile_id: string
    profile_name: string
    role_id: string
    role_name: string
    updated_at: string | null
}
