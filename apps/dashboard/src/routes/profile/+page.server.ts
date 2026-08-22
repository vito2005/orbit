import { createTelegramLinkCode, env, getProfile, getTelegramLink, saveProfile, unlinkTelegram } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
    const [profile, telegramLink] = await Promise.all([getProfile(locals.supabase), getTelegramLink(locals.supabase)])
    return {
        profile,
        telegramLink,
        botUsername: env.TELEGRAM_BOT_USERNAME,
    }
}

export const actions: Actions = {
    save: async ({ request, locals }) => {
        const data = await request.formData()
        const aboutMe = String(data.get('about_me') ?? '').trim()
        if (aboutMe.length > 50000) {
            return fail(400, { error: 'Слишком длинно (макс 50000 символов).' })
        }
        await saveProfile(locals.supabase, { about_me: aboutMe })
        throw redirect(303, '/profile?saved=1')
    },
    connectTelegram: async ({ locals }) => {
        const code = await createTelegramLinkCode(locals.supabase, locals.user!.id)
        throw redirect(303, `/profile?tg_code=${code}`)
    },
    unlinkTelegram: async ({ locals }) => {
        await unlinkTelegram(locals.supabase, locals.user!.id)
        throw redirect(303, '/profile?tg_unlinked=1')
    },
}
