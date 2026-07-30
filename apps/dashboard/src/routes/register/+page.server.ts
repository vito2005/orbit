import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) {
        throw redirect(303, '/')
    }
    return {}
}

export const actions: Actions = {
    default: async ({ request, locals, url }) => {
        const data = await request.formData()
        const email = String(data.get('email') ?? '').trim()
        const password = String(data.get('password') ?? '')
        const { data: result, error } = await locals.supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: `${url.origin}/auth/confirm` },
        })
        if (error) {
            return fail(400, { error: error.message, email })
        }
        // Confirmation off → a session is issued immediately, go straight in.
        if (result.session) {
            throw redirect(303, '/')
        }
        return { sent: true, email }
    },
}
