import { env, TELEGRAM_LOGIN_PAYLOAD } from '@orbit/shared'
import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

// Accounts are born in the bot now. Keeping the route means old links and
// bookmarks land on an explanation instead of a 404 — it just no longer signs
// anybody up, which is what stops one person owning two accounts.
export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) {
        throw redirect(303, '/')
    }
    // The payload makes Telegram send `/start login` on arrival, so the bot
    // answers with a way in instead of an empty chat.
    const botUsername = env.TELEGRAM_BOT_USERNAME
    return { botLink: botUsername ? `https://t.me/${botUsername}?start=${TELEGRAM_LOGIN_PAYLOAD}` : '' }
}
