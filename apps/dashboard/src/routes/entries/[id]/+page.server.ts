import { type Category, getEntry, getProfile, updateEntry } from '@orbit/shared'
import { error, fail, redirect } from '@sveltejs/kit'

import { safeRedirect } from '$lib/redirect'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
    const [entry, profile] = await Promise.all([getEntry(locals.supabase, params.id), getProfile(locals.supabase)])
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    return { entry, categories: profile.categories }
}

export const actions: Actions = {
    setCategory: async ({ params, request, locals }) => {
        const data = await request.formData()
        const category = String(data.get('category') ?? '')
        const { categories } = await getProfile(locals.supabase)
        if (!categories.includes(category)) {
            return fail(400, { error: 'invalid category' })
        }
        await updateEntry(locals.supabase, params.id as string, { category: category as Category })
        throw redirect(303, safeRedirect(data.get('redirectTo'), `/entries/${params.id}`))
    },
}
