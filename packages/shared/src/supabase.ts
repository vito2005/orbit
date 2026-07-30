import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from './env'
import type { Entry, NewEntry, Resume, StrategyReport, TelegramLink, UserProfile, WeekPlan } from './types'

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

// Entries that have been open for more than N days. The strategy report counts
// these so the user can archive aggressively (Bullet Journal migration rule:
// if you keep moving it, kill it).
export async function listStale(client: SupabaseClient, olderThanDays = 14, limit = 50): Promise<Entry[]> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await client
        .from('entries')
        .select('*')
        .neq('priority', 'archive')
        .is('done_at', null)
        .lt('created_at', cutoff)
        .order('created_at', { ascending: true })
        .limit(limit)
    if (error) {
        throw new Error(`DB list stale failed: ${error.message}`)
    }
    return (data ?? []) as Entry[]
}

export async function markDone(client: SupabaseClient, id: string, done: boolean): Promise<void> {
    const { error } = await client
        .from('entries')
        .update({ done_at: done ? new Date().toISOString() : null })
        .eq('id', id)
    if (error) throw new Error(`DB mark done failed: ${error.message}`)
}

export async function setPriority(client: SupabaseClient, id: string, priority: string): Promise<void> {
    const { error } = await client.from('entries').update({ priority }).eq('id', id)
    if (error) throw new Error(`DB set priority failed: ${error.message}`)
}

export async function listSubtasksOf(client: SupabaseClient, parentId: string): Promise<Entry[]> {
    const { data, error } = await client
        .from('entries')
        .select('*')
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true })
    if (error) {
        throw new Error(`DB list subtasks failed: ${error.message}`)
    }
    return (data ?? []) as Entry[]
}

export interface SubtaskCount {
    total: number
    done: number
}

export async function getParentTitles(client: SupabaseClient, entries: Entry[]): Promise<Record<string, string>> {
    const parentIds = [...new Set(entries.map((e) => e.parent_id).filter((id): id is string => id !== null))]
    if (parentIds.length === 0) {
        return {}
    }
    const { data, error } = await client.from('entries').select('id, title').in('id', parentIds)
    if (error) {
        throw new Error(`DB parent titles failed: ${error.message}`)
    }
    const map: Record<string, string> = {}
    for (const row of data ?? []) {
        const r = row as { id: string; title: string }
        map[r.id] = r.title
    }
    return map
}

export async function countSubtasksByParent(
    client: SupabaseClient,
    parentIds: string[],
): Promise<Map<string, SubtaskCount>> {
    const result = new Map<string, SubtaskCount>()
    if (parentIds.length === 0) {
        return result
    }
    const { data, error } = await client.from('entries').select('parent_id, done_at').in('parent_id', parentIds)
    if (error) {
        throw new Error(`DB subtask counts failed: ${error.message}`)
    }
    for (const row of data ?? []) {
        const r = row as { parent_id: string; done_at: string | null }
        const cur = result.get(r.parent_id) ?? { total: 0, done: 0 }
        cur.total++
        if (r.done_at !== null) {
            cur.done++
        }
        result.set(r.parent_id, cur)
    }
    return result
}

export async function setCategory(client: SupabaseClient, id: string, category: string): Promise<void> {
    const { error } = await client.from('entries').update({ category }).eq('id', id)
    if (error) throw new Error(`DB set category failed: ${error.message}`)
}

export async function setMotivation(client: SupabaseClient, id: string, motivation: string | null): Promise<void> {
    const { error } = await client.from('entries').update({ motivation }).eq('id', id)
    if (error) throw new Error(`DB set motivation failed: ${error.message}`)
}

export async function setExtraContext(client: SupabaseClient, id: string, extraContext: string | null): Promise<void> {
    const { error } = await client.from('entries').update({ extra_context: extraContext }).eq('id', id)
    if (error) throw new Error(`DB set extra_context failed: ${error.message}`)
}

export async function getProfile(client: SupabaseClient): Promise<UserProfile> {
    const { data, error } = await client
        .from('user_profile')
        .select('user_id, about_me, daily_hours, north_stars, updated_at')
        .maybeSingle()
    if (error) {
        throw new Error(`DB profile get failed: ${error.message}`)
    }
    if (!data) {
        return { user_id: '', about_me: '', daily_hours: 1, north_stars: '', updated_at: new Date().toISOString() }
    }
    const row = data as UserProfile
    // Postgres `numeric` can arrive as a string — normalize so the typed number is honest.
    return { ...row, daily_hours: Number(row.daily_hours) || 1 }
}

export async function saveProfile(client: SupabaseClient, aboutMe: string): Promise<void> {
    const { error } = await client
        .from('user_profile')
        .upsert({ about_me: aboutMe, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`DB profile save failed: ${error.message}`)
    }
}

export async function saveDailyHours(client: SupabaseClient, hours: number): Promise<void> {
    const { error } = await client
        .from('user_profile')
        .upsert({ daily_hours: hours, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`DB daily hours save failed: ${error.message}`)
    }
}

export async function saveNorthStars(client: SupabaseClient, northStars: string): Promise<void> {
    const { error } = await client
        .from('user_profile')
        .upsert({ north_stars: northStars, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) {
        throw new Error(`DB north stars save failed: ${error.message}`)
    }
}

export async function listResumes(client: SupabaseClient): Promise<Resume[]> {
    const { data, error } = await client.from('resumes').select('*').order('created_at', { ascending: false })
    if (error) {
        throw new Error(`DB list resumes failed: ${error.message}`)
    }
    return (data ?? []) as Resume[]
}

export async function addResume(client: SupabaseClient, args: { label: string; contentText: string }): Promise<Resume> {
    const { data, error } = await client
        .from('resumes')
        .insert({ label: args.label, content_text: args.contentText })
        .select()
        .single()
    if (error) {
        throw new Error(`DB add resume failed: ${error.message}`)
    }
    return data as Resume
}

export async function deleteResume(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('resumes').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete resume failed: ${error.message}`)
    }
}

export async function updateResume(
    client: SupabaseClient,
    id: string,
    args: { label?: string; contentText?: string },
): Promise<void> {
    const patch: Record<string, unknown> = {}
    if (args.label !== undefined) {
        patch.label = args.label
    }
    if (args.contentText !== undefined) {
        patch.content_text = args.contentText
    }
    if (Object.keys(patch).length === 0) {
        return
    }
    const { error } = await client.from('resumes').update(patch).eq('id', id)
    if (error) {
        throw new Error(`DB update resume failed: ${error.message}`)
    }
}

export async function countOpenInPriority(client: SupabaseClient, priority: string): Promise<number> {
    const { count, error } = await client
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('priority', priority)
        .is('done_at', null)
    if (error) throw new Error(`DB count failed: ${error.message}`)
    return count ?? 0
}

export async function listRecent(client: SupabaseClient, limit = 5): Promise<Entry[]> {
    const { data, error } = await client
        .from('entries')
        .select('*')
        .neq('priority', 'archive')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) throw new Error(`DB list recent failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function saveStrategyReport(
    client: SupabaseClient,
    args: {
        model: string
        body: string
        system_prompt: string
        user_content: string
    },
): Promise<StrategyReport> {
    const { data, error } = await client.from('strategy_reports').insert(args).select().single()
    if (error) {
        throw new Error(`DB strategy save failed: ${error.message}`)
    }
    return data as StrategyReport
}

export async function listStrategyReports(client: SupabaseClient, limit = 10): Promise<StrategyReport[]> {
    const { data, error } = await client
        .from('strategy_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        throw new Error(`DB list strategy failed: ${error.message}`)
    }
    return (data ?? []) as StrategyReport[]
}

export async function deleteStrategyReport(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('strategy_reports').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete strategy failed: ${error.message}`)
    }
}

export async function saveWeekPlan(
    client: SupabaseClient,
    args: {
        model: string
        body: string
        week_start: string
        system_prompt: string
        user_content: string
    },
): Promise<WeekPlan> {
    const { data, error } = await client.from('weekly_plans').insert(args).select().single()
    if (error) {
        throw new Error(`DB week plan save failed: ${error.message}`)
    }
    return data as WeekPlan
}

export async function listWeekPlans(client: SupabaseClient, limit = 10): Promise<WeekPlan[]> {
    const { data, error } = await client
        .from('weekly_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        throw new Error(`DB list week plans failed: ${error.message}`)
    }
    return (data ?? []) as WeekPlan[]
}

export async function deleteWeekPlan(client: SupabaseClient, id: string): Promise<void> {
    const { error } = await client.from('weekly_plans').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete week plan failed: ${error.message}`)
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
