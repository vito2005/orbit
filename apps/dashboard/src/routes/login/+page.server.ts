import { env, TELEGRAM_LOGIN_PAYLOAD } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import { safeRedirect } from '$lib/redirect'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
    if (locals.user) {
        throw redirect(303, safeRedirect(url.searchParams.get('next'), '/'))
    }
    // The payload makes Telegram send `/start login` on arrival, so the bot
    // answers with a way in instead of an empty chat.
    const botUsername = env.TELEGRAM_BOT_USERNAME
    return { botLink: botUsername ? `https://t.me/${botUsername}?start=${TELEGRAM_LOGIN_PAYLOAD}` : '' }
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
        throw redirect(303, safeRedirect(url.searchParams.get('next'), '/'))
    },
}
