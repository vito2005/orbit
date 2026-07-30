import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
    if (locals.user) {
        throw redirect(303, url.searchParams.get('next') ?? '/')
    }
    return {}
}

export const actions: Actions = {
    default: async ({ request, locals, url }) => {
        const data = await request.formData()
        const email = String(data.get('email') ?? '').trim()
        const password = String(data.get('password') ?? '')
        const { error } = await locals.supabase.auth.signInWithPassword({ email, password })
        if (error) {
            return fail(400, { error: 'Неверный email или пароль.', email })
        }
        throw redirect(303, url.searchParams.get('next') ?? '/')
    },
}
