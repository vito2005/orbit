import { createTelegramLinkCode, env, getProfile, getTelegramLink, unlinkTelegram } from '@orbit/shared'
import { redirect } from '@sveltejs/kit'

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
    connectTelegram: async ({ locals }) => {
        const code = await createTelegramLinkCode(locals.supabase, locals.user!.id)
        throw redirect(303, `/profile?tg_code=${code}`)
    },
    unlinkTelegram: async ({ locals }) => {
        await unlinkTelegram(locals.supabase, locals.user!.id)
        throw redirect(303, '/profile?tg_unlinked=1')
    },
}
