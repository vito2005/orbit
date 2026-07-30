import {
    archiveEntry,
    CATEGORIES,
    type Category,
    deleteEntry,
    generateMotivation,
    getEntry,
    getProfile,
    insertEntry,
    listResumes,
    listSubtasksOf,
    type NewEntry,
    PRIORITIES,
    type Priority,
    type SubtaskSuggestion,
    suggestSubtasks,
    updateEntry,
} from '@orbit/shared'
import { error, fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
    const [entry, subtasks] = await Promise.all([
        getEntry(locals.supabase, params.id),
        listSubtasksOf(locals.supabase, params.id),
    ])
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    const parent = entry.parent_id ? await getEntry(locals.supabase, entry.parent_id) : null
    return { entry, subtasks, parent }
}

function safeRedirect(data: FormData, fallback: string): string {
    const r = String(data.get('redirectTo') ?? '')
    if (r.startsWith('/') && !r.startsWith('//')) {
        return r
    }
    return fallback
}

export const actions: Actions = {
    archive: async ({ params, request, locals }) => {
        await archiveEntry(locals.supabase, params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/inbox'))
    },
    delete: async ({ params, request, locals }) => {
        await deleteEntry(locals.supabase, params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/inbox'))
    },
    setPriority: async ({ params, request, locals }) => {
        const data = await request.formData()
        const priority = String(data.get('priority') ?? '')
        if (!(PRIORITIES as readonly string[]).includes(priority)) {
            return fail(400, { error: 'invalid priority' })
        }
        await updateEntry(locals.supabase, params.id as string, { priority: priority as Priority })
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    setCategory: async ({ params, request, locals }) => {
        const data = await request.formData()
        const category = String(data.get('category') ?? '')
        if (!(CATEGORIES as readonly string[]).includes(category)) {
            return fail(400, { error: 'invalid category' })
        }
        await updateEntry(locals.supabase, params.id as string, { category: category as Category })
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    suggestSplit: async ({ params, locals }) => {
        const entry = await getEntry(locals.supabase, params.id as string)
        if (!entry) {
            return fail(404, { error: 'entry not found' })
        }
        const [profile, resumes] = await Promise.all([getProfile(locals.supabase), listResumes(locals.supabase)])
        const result = await suggestSubtasks(entry, profile, resumes)
        if (result.kind === 'needs_context') {
            return { needsContext: result.question }
        }
        if (result.subtasks.length === 0) {
            return fail(500, { error: 'AI не вернул подзадачи.' })
        }
        return { suggestions: result.subtasks }
    },
    setExtraContext: async ({ params, request, locals }) => {
        const data = await request.formData()
        const raw = String(data.get('extra_context') ?? '').trim()
        const value = raw.length > 0 ? raw : null
        await updateEntry(locals.supabase, params.id as string, { extra_context: value })
        throw redirect(303, `/entries/${params.id}?context_saved=1`)
    },
    generateMotivation: async ({ params, locals }) => {
        const entry = await getEntry(locals.supabase, params.id as string)
        if (!entry) {
            return fail(404, { error: 'entry not found' })
        }
        const [parent, profile, resumes] = await Promise.all([
            entry.parent_id ? getEntry(locals.supabase, entry.parent_id) : Promise.resolve(null),
            getProfile(locals.supabase),
            listResumes(locals.supabase),
        ])
        const text = await generateMotivation(entry, parent, profile, resumes)
        if (!text) {
            return fail(500, { error: 'AI не вернул мотивацию.' })
        }
        await updateEntry(locals.supabase, entry.id, { motivation: text })
        throw redirect(303, `/entries/${entry.id}`)
    },
    clearMotivation: async ({ params, locals }) => {
        await updateEntry(locals.supabase, params.id as string, { motivation: null })
        throw redirect(303, `/entries/${params.id}`)
    },
    createSubtasks: async ({ params, request, locals }) => {
        const parent = await getEntry(locals.supabase, params.id as string)
        if (!parent) {
            return fail(404, { error: 'parent not found' })
        }
        const data = await request.formData()
        const selected = data
            .getAll('subtask')
            .map(String)
            .map((raw) => {
                try {
                    return JSON.parse(raw) as SubtaskSuggestion
                } catch {
                    return null
                }
            })
            .filter((s): s is SubtaskSuggestion => s !== null && typeof s.title === 'string' && s.title.length > 0)

        if (selected.length === 0) {
            return fail(400, { error: 'Ничего не выбрано.' })
        }

        for (const s of selected) {
            const inherited = {
                title: s.title,
                summary: '',
                category: parent.category,
                tags: parent.tags,
                next_action: s.next_action,
                energy: parent.energy,
                content_potential: null,
            }
            const entry: NewEntry = {
                telegram_message_id: null,
                type: 'text',
                original_audio_url: null,
                transcript: s.title,
                title: s.title,
                summary: '',
                category: parent.category,
                tags: parent.tags,
                next_action: s.next_action,
                priority: 'backlog',
                energy: parent.energy,
                content_potential: null,
                raw_ai_json: inherited,
                parent_id: parent.id,
            }
            await insertEntry(locals.supabase, entry)
        }
        throw redirect(303, `/entries/${parent.id}`)
    },
}
