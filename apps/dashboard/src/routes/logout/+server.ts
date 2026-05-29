import { redirect } from '@sveltejs/kit'

import { clearSession } from '$lib/auth'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ cookies }) => {
    clearSession(cookies)
    throw redirect(303, '/login')
}
