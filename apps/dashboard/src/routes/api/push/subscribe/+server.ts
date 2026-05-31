import { json } from '@sveltejs/kit'

import { startTestPushes } from '$lib/server/push'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
    const subscription = await request.json()
    startTestPushes(subscription)

    return json({ ok: true })
}
