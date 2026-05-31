import { json } from '@sveltejs/kit'

import { publicVapidKey } from '$lib/server/push'

import type { RequestHandler } from './$types'

export const GET: RequestHandler = () => {
    return json({ publicKey: publicVapidKey() })
}
