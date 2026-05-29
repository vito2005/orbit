import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from './env'
import type { Entry, NewEntry } from './types'

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

function todayLocalDate(): string {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export async function listTodayPlan(): Promise<Entry[]> {
    const supabase = getSupabase()
    const today = todayLocalDate()
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('scheduled_for', today)
        .order('done_at', { ascending: true, nullsFirst: true })
        .order('priority', { ascending: true })
    if (error) throw new Error(`DB today plan failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function listPlanCandidates(): Promise<Entry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .in('priority', ['now', 'this_week'])
        .is('done_at', null)
        .is('scheduled_for', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(50)
    if (error) throw new Error(`DB plan candidates failed: ${error.message}`)
    return (data ?? []) as Entry[]
}

export async function listWeek(): Promise<Entry[]> {
    const supabase = getSupabase()
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .in('priority', ['now', 'this_week'])
        .is('done_at', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(200)
    if (error) throw new Error(`DB week failed: ${error.message}`)
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

export async function scheduleEntries(ids: string[], date: string | null): Promise<void> {
    if (ids.length === 0) return
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ scheduled_for: date }).in('id', ids)
    if (error) throw new Error(`DB schedule failed: ${error.message}`)
}

export async function setPriority(id: string, priority: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ priority }).eq('id', id)
    if (error) throw new Error(`DB set priority failed: ${error.message}`)
}

export async function setCategory(id: string, category: string): Promise<void> {
    const supabase = getSupabase()
    const { error } = await supabase.from('entries').update({ category }).eq('id', id)
    if (error) throw new Error(`DB set category failed: ${error.message}`)
}

export async function scheduleFor(id: string, date: string | null): Promise<void> {
    await scheduleEntries([id], date)
}
