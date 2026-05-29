import { env } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import { setSession } from '$lib/auth'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
    if (locals.authed) {
        throw redirect(303, url.searchParams.get('next') ?? '/')
    }
    return {}
}

export const actions: Actions = {
    default: async ({ request, cookies, url }) => {
        const data = await request.formData()
        const password = String(data.get('password') ?? '')
        if (password !== env.DASHBOARD_PASSWORD) {
            return fail(401, { error: 'Wrong password' })
        }
        setSession(cookies)
        throw redirect(303, url.searchParams.get('next') ?? '/')
    },
}
