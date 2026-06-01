import {
    archiveEntry,
    CATEGORIES,
    deleteEntry,
    generateMotivation,
    getEntry,
    getProfile,
    insertEntry,
    listResumes,
    listSubtasksOf,
    type NewEntry,
    PRIORITIES,
    scheduleFor,
    setCategory,
    setMotivation,
    setPriority,
    type SubtaskSuggestion,
    suggestSubtasks,
} from '@orbit/shared'
import { error, fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
    const [entry, subtasks] = await Promise.all([getEntry(params.id), listSubtasksOf(params.id)])
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    return { entry, subtasks }
}

function safeRedirect(data: FormData, fallback: string): string {
    const r = String(data.get('redirectTo') ?? '')
    if (r.startsWith('/') && !r.startsWith('//')) {
        return r
    }
    return fallback
}

export const actions: Actions = {
    archive: async ({ params, request }) => {
        await archiveEntry(params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/'))
    },
    delete: async ({ params, request }) => {
        await deleteEntry(params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/'))
    },
    setPriority: async ({ params, request }) => {
        const data = await request.formData()
        const priority = String(data.get('priority') ?? '')
        if (!(PRIORITIES as readonly string[]).includes(priority)) {
            return fail(400, { error: 'invalid priority' })
        }
        await setPriority(params.id as string, priority)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    setCategory: async ({ params, request }) => {
        const data = await request.formData()
        const category = String(data.get('category') ?? '')
        if (!(CATEGORIES as readonly string[]).includes(category)) {
            return fail(400, { error: 'invalid category' })
        }
        await setCategory(params.id as string, category)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    scheduleFor: async ({ params, request }) => {
        const data = await request.formData()
        const raw = String(data.get('date') ?? '').trim()
        const date = raw.length > 0 ? raw : null
        await scheduleFor(params.id as string, date)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    suggestSplit: async ({ params }) => {
        const entry = await getEntry(params.id as string)
        if (!entry) {
            return fail(404, { error: 'entry not found' })
        }
        const [profile, resumes] = await Promise.all([getProfile(), listResumes()])
        const suggestions = await suggestSubtasks(entry, profile.about_me, resumes)
        if (suggestions.length === 0) {
            return fail(500, { error: 'AI не вернул подзадачи.' })
        }
        return { suggestions }
    },
    generateMotivation: async ({ params }) => {
        const entry = await getEntry(params.id as string)
        if (!entry) {
            return fail(404, { error: 'entry not found' })
        }
        const [parent, profile, resumes] = await Promise.all([
            entry.parent_id ? getEntry(entry.parent_id) : Promise.resolve(null),
            getProfile(),
            listResumes(),
        ])
        const text = await generateMotivation(entry, parent, profile.about_me, resumes)
        if (!text) {
            return fail(500, { error: 'AI не вернул мотивацию.' })
        }
        await setMotivation(entry.id, text)
        throw redirect(303, `/entries/${entry.id}`)
    },
    clearMotivation: async ({ params }) => {
        await setMotivation(params.id as string, null)
        throw redirect(303, `/entries/${params.id}`)
    },
    createSubtasks: async ({ params, request }) => {
        const parent = await getEntry(params.id as string)
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

        const inheritedPriority = parent.priority === 'archive' ? 'later' : parent.priority
        for (const s of selected) {
            const inherited = {
                title: s.title,
                summary: '',
                category: parent.category,
                tags: parent.tags,
                next_action: s.next_action,
                priority: inheritedPriority,
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
                priority: inheritedPriority,
                energy: parent.energy,
                content_potential: null,
                raw_ai_json: inherited,
                parent_id: parent.id,
            }
            await insertEntry(entry)
        }
        throw redirect(303, `/entries/${parent.id}`)
    },
}
