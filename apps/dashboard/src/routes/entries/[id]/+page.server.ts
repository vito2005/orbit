import { CATEGORIES, type Category, getEntry, listSubtasksOf, updateEntry } from '@orbit/shared'
import { error, fail, redirect } from '@sveltejs/kit'

import { safeRedirect } from '$lib/redirect'

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

export const actions: Actions = {
    setCategory: async ({ params, request, locals }) => {
        const data = await request.formData()
        const category = String(data.get('category') ?? '')
        if (!(CATEGORIES as readonly string[]).includes(category)) {
            return fail(400, { error: 'invalid category' })
        }
        await updateEntry(locals.supabase, params.id as string, { category: category as Category })
        throw redirect(303, safeRedirect(data.get('redirectTo'), `/entries/${params.id}`))
    },
}
