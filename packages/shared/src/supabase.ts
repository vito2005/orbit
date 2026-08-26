import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from './env'
import {
    DEFAULT_CATEGORIES,
    type Entry,
    type EntryPatch,
    type NewEntry,
    type TelegramLink,
    type UserProfile,
} from './types'

let cached: SupabaseClient | null = null

// Service-role client — bypasses RLS. The bot and admin-only operations use it.
// The dashboard passes its own per-request client (anon key + user session) so
// RLS scopes every query to the logged-in user.
export function getServiceClient(): SupabaseClient {
    if (cached) return cached
    cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    })
    return cached
}

export async function uploadAudio(
    client: SupabaseClient,
    userId: string,
    bytes: ArrayBuffer | Uint8Array,
    fileName: string,
    contentType: string,
): Promise<string> {
    const bucket = env.SUPABASE_STORAGE_BUCKET
    const path = `${userId}/${new Date().toISOString().slice(0, 10)}/${fileName}`
    const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)

    const { error } = await client.storage.from(bucket).upload(path, body, {
        contentType,
        upsert: false,
    })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)

    const { data } = client.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
}

export async function insertEntry(client: SupabaseClient, entry: NewEntry): Promise<Entry> {
    const { data, error } = await client.from('entries').insert(entry).select().single()
    if (error) throw new Error(`DB insert failed: ${error.message}`)
    return data as Entry
}

export async function listEntries(
    client: SupabaseClient,
    opts: {
        category?: string
        search?: string
        tag?: string
        done?: boolean
        limit?: number
        sinceDays?: number
    } = {},
): Promise<Entry[]> {
    let query = client
        .from('entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? 200)

    if (opts.category) {
        query = query.eq('category', opts.category)
    }
    if (opts.tag) {
        query = query.contains('tags', [opts.tag])
    }
    if (opts.done !== undefined) {
        query = opts.done ? query.not('done_at', 'is', null) : query.is('done_at', null)
    }
    if (opts.sinceDays) {
        const since = new Date(Date.now() - opts.sinceDays * 24 * 60 * 60 * 1000)
        query = query.gte('created_at', since.toISOString())
    }
    if (opts.search) {
        const term = opts.search.replace(/[%,]/g, ' ').trim()
        if (term.length > 0) {
            query = query.or(`title.ilike.%${term}%,summary.ilike.%${term}%,transcript.ilike.%${term}%`)
        }
    }

    const { data, error } = await query
    if (error) throw new Error(`DB list failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

// Every entry the user has, paged past PostgREST's row cap. Used by the export,
// which must never silently truncate someone's data.
export async function listAllEntries(client: SupabaseClient): Promise<Entry[]> {
    const pageSize = 1000
    const all: Entry[] = []
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await client
            .from('entries')
            .select('*')
            .order('created_at', { ascending: true })
            .range(from, from + pageSize - 1)
        if (error) {
            throw new Error(`DB export list failed: ${error.message}`)
        }
        const rows = (data ?? []) as Entry[]
        all.push(...rows)
        if (rows.length < pageSize) {
            return all
        }
    }
}

// Tags for the inbox filter, commonest first. Single-use tags are deliberately
// left out — they are the large majority (183 of 220 at the time of writing) and
// turn the dropdown into noise. They stay reachable by clicking a tag on a card.
export async function listTags(client: SupabaseClient): Promise<{ tag: string; count: number }[]> {
    const { data, error } = await client.from('entries').select('tags').limit(2000)
    if (error) {
        throw new Error(`DB list tags failed: ${error.message}`)
    }
    const freq = new Map<string, number>()
    for (const row of (data ?? []) as { tags: string[] }[]) {
        for (const tag of row.tags ?? []) {
            freq.set(tag, (freq.get(tag) ?? 0) + 1)
        }
    }
    return [...freq.entries()]
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
        .map(([tag, count]) => ({ tag, count }))
}

export async function getEntry(client: SupabaseClient, id: string): Promise<Entry | null> {
    const { data, error } = await client.from('entries').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`DB get failed: ${error.message}`)
    return (data as Entry | null) ?? null
}

export async function listByPriorities(client: SupabaseClient, priorities: string[]): Promise<Entry[]> {
    const { data, error } = await client
        .from('entries')
        .select('*')
        .in('priority', priorities)
        .order('created_at', { ascending: false })
        .limit(100)
    if (error) throw new Error(`DB list failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function archiveEntry(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('entries').update({ priority: 'archive' }).eq('id', id)
    if (error) throw new Error(`DB archive failed: ${error.message}`)
}

export async function deleteEntry(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('entries').delete().eq('id', id)
    if (error) throw new Error(`DB delete failed: ${error.message}`)
}

export async function updateEntry(client: SupabaseClient, id: string, patch: EntryPatch): Promise<void> {
    const { error } = await client.from('entries').update(patch).eq('id', id)
    if (error) throw new Error(`DB entry update failed: ${error.message}`)
}

const FIELDS = 'user_id, categories, updated_at'

function withFallback(row: UserProfile | null): UserProfile {
    if (!row) {
        return { user_id: '', categories: [...DEFAULT_CATEGORIES], updated_at: new Date().toISOString() }
    }
    return { ...row, categories: row.categories?.length ? row.categories : [...DEFAULT_CATEGORIES] }
}

// RLS scopes this to the caller, so the dashboard needs no user_id.
export async function getProfile(client: SupabaseClient): Promise<UserProfile> {
    const { data, error } = await client.from('user_profile').select(FIELDS).maybeSingle()
    if (error) {
        throw new Error(`DB profile get failed: ${error.message}`)
    }
    return withFallback(data as UserProfile | null)
}

// The bot runs under the service role, which bypasses RLS — without an explicit
// user_id it would read somebody else's row.
export async function getProfileFor(client: SupabaseClient, userId: string): Promise<UserProfile> {
    const { data, error } = await client.from('user_profile').select(FIELDS).eq('user_id', userId).maybeSingle()
    if (error) {
        throw new Error(`DB profile get failed: ${error.message}`)
    }
    return withFallback(data as UserProfile | null)
}

export async function saveCategories(client: SupabaseClient, categories: string[]): Promise<void> {
    const { error } = await client
        .from('user_profile')
        .upsert({ categories, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`DB categories save failed: ${error.message}`)
    }
}

// --- Telegram account linking ---------------------------------------------
// The dashboard creates a one-time code (as the logged-in user); the bot
// consumes it under the service-role client to bind a telegram_id to that user.

export async function createTelegramLinkCode(client: SupabaseClient, userId: string): Promise<string> {
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    const { error } = await client.from('telegram_link_codes').insert({ code, user_id: userId })
    if (error) {
        throw new Error(`DB create link code failed: ${error.message}`)
    }
    return code
}

export async function consumeTelegramLinkCode(client: SupabaseClient, code: string): Promise<string | null> {
    const { data, error } = await client.from('telegram_link_codes').select('user_id').eq('code', code).maybeSingle()
    if (error) {
        throw new Error(`DB read link code failed: ${error.message}`)
    }
    if (!data) {
        return null
    }
    await client.from('telegram_link_codes').delete().eq('code', code)
    return (data as { user_id: string }).user_id
}

// Bot-first signup. Supabase needs an address to issue the magic link that logs
// the person into the dashboard, so a Telegram-born account gets a synthetic one.
// Nobody types it or sees it; attaching a real address later keeps the same user id.
const TELEGRAM_EMAIL_DOMAIN = 'bot.abuki.dev'

function telegramEmail(telegramId: number): string {
    return `tg-${telegramId}@${TELEGRAM_EMAIL_DOMAIN}`
}

// Nobody typed this address or would recognise it, so the UI has to know when
// it is looking at one and show the person something they know instead.
export function isTelegramEmail(email: string | undefined | null): boolean {
    return Boolean(email?.endsWith(`@${TELEGRAM_EMAIL_DOMAIN}`))
}

// Supabase admin has no "get user by email", but generateLink returns the user
// for an address already taken — which is how a repeat signup after unlinking
// finds its old account instead of orphaning it.
async function findUserByEmail(client: SupabaseClient, email: string): Promise<string | null> {
    const { data, error } = await client.auth.admin.generateLink({ type: 'magiclink', email })
    if (error) {
        return null
    }
    return data.user?.id ?? null
}

// The bot holds the service role, so it mints the login token itself — that is
// why the dashboard needs no admin key to accept it. Supabase owns the token's
// single use and its expiry, so there is no code table of ours to police.
export async function createDashboardLoginToken(client: SupabaseClient, userId: string): Promise<string> {
    const { data: found, error: lookupError } = await client.auth.admin.getUserById(userId)
    const email = found?.user?.email
    if (lookupError || !email) {
        throw new Error(`Auth user lookup failed: ${lookupError?.message ?? 'account has no email'}`)
    }
    const { data, error } = await client.auth.admin.generateLink({ type: 'magiclink', email })
    const token = data?.properties?.hashed_token
    if (error || !token) {
        throw new Error(`Login link failed: ${error?.message ?? 'no token returned'}`)
    }
    return token
}

export async function createUserForTelegram(
    client: SupabaseClient,
    telegramId: number,
    username?: string,
): Promise<string> {
    const email = telegramEmail(telegramId)
    // The handle rides in user_metadata rather than a column: it arrives with
    // every session already, so the dashboard needs no extra query to greet
    // somebody by the name they know themselves by.
    const created = await client.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: username ? { telegram_username: username } : {},
    })
    const userId = created.error ? await findUserByEmail(client, email) : created.data.user.id
    if (!userId) {
        throw new Error(`Auth user create failed: ${created.error?.message}`)
    }
    await linkTelegramUser(client, userId, telegramId)
    return userId
}

export async function linkTelegramUser(client: SupabaseClient, userId: string, telegramId: number): Promise<void> {
    // Free this telegram from any prior account, then bind it to this user
    // (replacing whatever telegram they had before). This is what makes
    // relinking to a different account "just link again" from the bot.
    await client.from('telegram_links').delete().eq('telegram_id', telegramId)
    const { error } = await client
        .from('telegram_links')
        .upsert({ user_id: userId, telegram_id: telegramId }, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`DB link telegram failed: ${error.message}`)
    }
}

export async function unlinkTelegram(client: SupabaseClient, userId: string): Promise<void> {
    const { error } = await client.from('telegram_links').delete().eq('user_id', userId)
    if (error) {
        throw new Error(`DB unlink telegram failed: ${error.message}`)
    }
}

export async function resolveTelegramUser(client: SupabaseClient, telegramId: number): Promise<string | null> {
    const { data, error } = await client
        .from('telegram_links')
        .select('user_id')
        .eq('telegram_id', telegramId)
        .maybeSingle()
    if (error) {
        throw new Error(`DB resolve telegram failed: ${error.message}`)
    }
    return data ? (data as { user_id: string }).user_id : null
}

export async function getTelegramLink(client: SupabaseClient): Promise<TelegramLink | null> {
    const { data, error } = await client.from('telegram_links').select('*').maybeSingle()
    if (error) {
        throw new Error(`DB get telegram link failed: ${error.message}`)
    }
    return (data as TelegramLink | null) ?? null
}
