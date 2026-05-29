import { env } from '@orbit/shared'
import type { Cookies } from '@sveltejs/kit'

const SESSION_COOKIE = 'orbit_session'

export function expectedToken(): string {
    return `v1:${simpleHash(env.DASHBOARD_PASSWORD)}`
}

export function setSession(cookies: Cookies): void {
    cookies.set(SESSION_COOKIE, expectedToken(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
    })
}

export function clearSession(cookies: Cookies): void {
    cookies.delete(SESSION_COOKIE, { path: '/' })
}

export function readSession(cookies: Cookies): string | undefined {
    return cookies.get(SESSION_COOKIE)
}

function simpleHash(input: string): string {
    let h = 2166136261
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return (h >>> 0).toString(16)
}
