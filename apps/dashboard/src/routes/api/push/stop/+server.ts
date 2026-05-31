import { json } from '@sveltejs/kit'

import { stopTestPushes } from '$lib/server/push'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = () => {
    stopTestPushes()

    return json({ ok: true })
}
