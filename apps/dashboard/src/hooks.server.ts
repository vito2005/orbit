import { env } from '@orbit/shared'
import type { Cookies, Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

const SESSION_COOKIE = 'orbit_session'

export const handle: Handle = async ({ event, resolve }) => {
    const sessionToken = event.cookies.get(SESSION_COOKIE)
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

export function expectedToken(): string {
    // The "token" is just a hash of the password; we never store the password in
    // the cookie.
    return `v1:${simpleHash(env.DASHBOARD_PASSWORD)}`
}

export function setSession(cookies: Cookies) {
    cookies.set(SESSION_COOKIE, expectedToken(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
    })
}

export function clearSession(cookies: Cookies) {
    cookies.delete(SESSION_COOKIE, { path: '/' })
}

function simpleHash(input: string): string {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16)
}
