import type { RequestHandler } from './$types'

export const GET: RequestHandler = async () => {
    return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
        headers: { 'content-type': 'application/json' },
    })
}
