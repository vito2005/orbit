import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

import { expectedToken, readSession } from '$lib/auth'

export const handle: Handle = async ({ event, resolve }) => {
    const sessionToken = readSession(event.cookies)
    event.locals.authed = sessionToken === expectedToken()

    const path = event.url.pathname
    const isLogin = path === '/login'
    const isPublicApi = path === '/api/health'

    if (!event.locals.authed && !isLogin && !isPublicApi) {
        if (path.startsWith('/api/')) {
            return new Response('Unauthorized', { status: 401 })
        }
        throw redirect(303, `/login?next=${encodeURIComponent(path)}`)
    }

    return resolve(event)
}
