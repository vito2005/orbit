import { redirect } from '@sveltejs/kit'

import { clearSession } from '../../hooks.server'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ cookies }) => {
    clearSession(cookies)
    throw redirect(303, '/login')
}
