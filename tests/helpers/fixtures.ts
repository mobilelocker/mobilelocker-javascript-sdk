/** Server-shaped storage entry (snake_case bridge payload). */
export function serverStorageEntry(
    overrides: Partial<{
        uuid: string
        id: number
        team_id: number
        user_id: number
        presentation_id: number | null
        name: string
        data: unknown
        created_at: string | null
        updated_at: string | null
    }> = {},
) {
    return {
        uuid: 'u',
        id: 1,
        team_id: 1,
        user_id: 2,
        presentation_id: 3,
        name: 'k',
        data: null as unknown,
        created_at: null as string | null,
        updated_at: null as string | null,
        ...overrides,
    }
}

/** Mapped client StorageEntry fields from a server entry. */
export function clientStorageEntry(
    overrides: Partial<{
        name: string
        data: unknown
        team_id: number
        user_id: number
        presentation_id: number | null
        created_at: string | null
        updated_at: string | null
    }> = {},
) {
    return {
        name: 'k',
        data: null as unknown,
        team_id: 1,
        user_id: 2,
        presentation_id: 3,
        created_at: null as string | null,
        updated_at: null as string | null,
        ...overrides,
    }
}
