import { env } from '@orbit/shared'
import { createServerClient } from '@supabase/ssr'
import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'

const PUBLIC_PATHS = ['/login', '/register', '/api/health']

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        cookies: {
            getAll: () => event.cookies.getAll(),
            setAll: (cookiesToSet) => {
                for (const { name, value, options } of cookiesToSet) {
                    event.cookies.set(name, value, { ...options, path: '/' })
                }
            },
        },
    })

    // getUser() re-validates the JWT with Supabase; getSession() alone trusts the
    // cookie unverified, so the auth gate keys off getUser().
    const {
        data: { user },
    } = await event.locals.supabase.auth.getUser()
    event.locals.user = user

    const path = event.url.pathname
    const isPublic = PUBLIC_PATHS.includes(path) || path.startsWith('/auth')
    if (!user && !isPublic) {
        if (path.startsWith('/api/')) {
            return new Response('Unauthorized', { status: 401 })
        }
        throw redirect(303, `/login?next=${encodeURIComponent(path)}`)
    }

    return resolve(event, {
        filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version',
    })
}
