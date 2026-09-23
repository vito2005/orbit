import { deleteTranslation, getTranslation } from '@orbit/shared'
import { error, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
    const translation = await getTranslation(locals.supabase, params.id)
    if (!translation) {
        throw error(404, 'Translation not found')
    }
    return { translation }
}

export const actions: Actions = {
    delete: async ({ params, locals }) => {
        await deleteTranslation(locals.supabase, params.id)
        throw redirect(303, '/translations')
    },
}
