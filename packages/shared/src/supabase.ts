import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from './env'
import type { Entry, NewEntry, Resume, StrategyReport, UserProfile, WeekPlan } from './types'

let cached: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
    if (cached) return cached
    cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    })
    return cached
}

export async function uploadAudio(
    bytes: ArrayBuffer | Uint8Array,
    fileName: string,
    contentType: string,
): Promise<string> {
    const supabase = getSupabase()
    const bucket = env.SUPABASE_STORAGE_BUCKET
    const path = `${new Date().toISOString().slice(0, 10)}/${fileName}`
    const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)

    const { error } = await supabase.storage.from(bucket).upload(path, body, {
        contentType,
        upsert: false,
    })
    if (error) throw new Error(`Storage upload failed: ${error.message}`)

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
}

export async function insertEntry(entry: NewEntry): Promise<Entry> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('entries').insert(entry).select().single()
    if (error) throw new Error(`DB insert failed: ${error.message}`)
    return data as Entry
}

export async function listEntries(
    opts: {
        category?: string
        search?: string
        limit?: number
        sinceDays?: number
    } = {},
): Promise<Entry[]> {
    const supabase = getSupabase()
    let query = supabase
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

export async function getEntry(id: string): Promise<Entry | null> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('entries').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`DB get failed: ${error.message}`)
    return (data as Entry | null) ?? null
}

export async function listByPriorities(priorities: string[]): Promise<Entry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .in('priority', priorities)
        .order('created_at', { ascending: false })
        .limit(100)
    if (error) throw new Error(`DB list failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function archiveEntry(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ priority: 'archive' }).eq('id', id)
    if (error) throw new Error(`DB archive failed: ${error.message}`)
}

export async function deleteEntry(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').delete().eq('id', id)
    if (error) throw new Error(`DB delete failed: ${error.message}`)
}

// Entries that have been open for more than N days. The strategy report counts
// these so the user can archive aggressively (Bullet Journal migration rule:
// if you keep moving it, kill it).
export async function listStale(olderThanDays = 14, limit = 50): Promise<Entry[]> {
    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
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

export async function markDone(id: string, done: boolean): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('entries')
        .update({ done_at: done ? new Date().toISOString() : null })
        .eq('id', id)
    if (error) throw new Error(`DB mark done failed: ${error.message}`)
}

export async function setPriority(id: string, priority: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ priority }).eq('id', id)
    if (error) throw new Error(`DB set priority failed: ${error.message}`)
}

export async function listSubtasksOf(parentId: string): Promise<Entry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
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

export async function getParentTitles(entries: Entry[]): Promise<Record<string, string>> {
    const parentIds = [...new Set(entries.map((e) => e.parent_id).filter((id): id is string => id !== null))]
    if (parentIds.length === 0) {
        return {}
    }
    const supabase = getSupabase()
    const { data, error } = await supabase.from('entries').select('id, title').in('id', parentIds)
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

export async function countSubtasksByParent(parentIds: string[]): Promise<Map<string, SubtaskCount>> {
    const result = new Map<string, SubtaskCount>()
    if (parentIds.length === 0) {
        return result
    }
    const supabase = getSupabase()
    const { data, error } = await supabase.from('entries').select('parent_id, done_at').in('parent_id', parentIds)
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

export async function setCategory(id: string, category: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ category }).eq('id', id)
    if (error) throw new Error(`DB set category failed: ${error.message}`)
}

export async function setMotivation(id: string, motivation: string | null): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ motivation }).eq('id', id)
    if (error) throw new Error(`DB set motivation failed: ${error.message}`)
}

export async function setExtraContext(id: string, extraContext: string | null): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ extra_context: extraContext }).eq('id', id)
    if (error) throw new Error(`DB set extra_context failed: ${error.message}`)
}

export async function getProfile(): Promise<UserProfile> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('user_profile')
        .select('about_me, daily_hours, updated_at')
        .eq('id', true)
        .maybeSingle()
    if (error) {
        throw new Error(`DB profile get failed: ${error.message}`)
    }
    if (!data) {
        return { about_me: '', daily_hours: 1, updated_at: new Date().toISOString() }
    }
    const row = data as UserProfile
    // Postgres `numeric` can arrive as a string — normalize so the typed number is honest.
    return { ...row, daily_hours: Number(row.daily_hours) || 1 }
}

export async function saveDailyHours(hours: number): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('user_profile')
        .update({ daily_hours: hours, updated_at: new Date().toISOString() })
        .eq('id', true)
    if (error) {
        throw new Error(`DB daily hours save failed: ${error.message}`)
    }
}

export async function saveProfile(aboutMe: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase
        .from('user_profile')
        .upsert({ id: true, about_me: aboutMe, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    if (error) {
        throw new Error(`DB profile save failed: ${error.message}`)
    }
}

export async function listResumes(): Promise<Resume[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('resumes').select('*').order('created_at', { ascending: false })
    if (error) {
        throw new Error(`DB list resumes failed: ${error.message}`)
    }
    return (data ?? []) as Resume[]
}

export async function addResume(args: { label: string; contentText: string }): Promise<Resume> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('resumes')
        .insert({ label: args.label, content_text: args.contentText })
        .select()
        .single()
    if (error) {
        throw new Error(`DB add resume failed: ${error.message}`)
    }
    return data as Resume
}

export async function deleteResume(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('resumes').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete resume failed: ${error.message}`)
    }
}

export async function updateResume(id: string, args: { label?: string; contentText?: string }): Promise<void> {
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
    const supabase = getSupabase()
    const { error } = await supabase.from('resumes').update(patch).eq('id', id)
    if (error) {
        throw new Error(`DB update resume failed: ${error.message}`)
    }
}

export async function countOpenInPriority(priority: string): Promise<number> {
    const supabase = getSupabase()
    const { count, error } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('priority', priority)
        .is('done_at', null)
    if (error) throw new Error(`DB count failed: ${error.message}`)
    return count ?? 0
}

export async function listRecent(limit = 5): Promise<Entry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .neq('priority', 'archive')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) throw new Error(`DB list recent failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function saveStrategyReport(args: {
    model: string
    body: string
    system_prompt: string
    user_content: string
}): Promise<StrategyReport> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('strategy_reports').insert(args).select().single()
    if (error) {
        throw new Error(`DB strategy save failed: ${error.message}`)
    }
    return data as StrategyReport
}

export async function listStrategyReports(limit = 10): Promise<StrategyReport[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('strategy_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        throw new Error(`DB list strategy failed: ${error.message}`)
    }
    return (data ?? []) as StrategyReport[]
}

export async function deleteStrategyReport(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('strategy_reports').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete strategy failed: ${error.message}`)
    }
}

export async function saveWeekPlan(args: {
    model: string
    body: string
    week_start: string
    system_prompt: string
    user_content: string
}): Promise<WeekPlan> {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('weekly_plans').insert(args).select().single()
    if (error) {
        throw new Error(`DB week plan save failed: ${error.message}`)
    }
    return data as WeekPlan
}

export async function listWeekPlans(limit = 10): Promise<WeekPlan[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
    if (error) {
        throw new Error(`DB list week plans failed: ${error.message}`)
    }
    return (data ?? []) as WeekPlan[]
}

export async function deleteWeekPlan(id: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('weekly_plans').delete().eq('id', id)
    if (error) {
        throw new Error(`DB delete week plan failed: ${error.message}`)
    }
}
