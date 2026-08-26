import { isTelegramEmail } from '@orbit/shared'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
    const user = locals.user
    if (!user) {
        return { accountLabel: null }
    }
    // A Telegram-born account's address is synthetic — showing it would mean
    // greeting someone by a name they have never seen. Their handle rides along
    // in the session, so prefer it whenever the address is one of ours.
    const handle = user.user_metadata?.telegram_username
    if (isTelegramEmail(user.email) && typeof handle === 'string' && handle.length > 0) {
        return { accountLabel: `@${handle}` }
    }
    return { accountLabel: isTelegramEmail(user.email) ? 'Telegram' : (user.email ?? null) }
}
