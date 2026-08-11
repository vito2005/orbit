import { deleteEntry, type EntryPatch, PRIORITIES, type Priority, updateEntry } from '@orbit/shared'
import { error, json } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

// Mutation endpoints rather than form actions: these buttons have to feel
// instant, and a form POST costs a full navigation plus a re-render of the
// whole list. RLS scopes both handlers to the logged-in user.
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    const body = (await request.json()) as { done?: boolean; priority?: string }
    const patch: EntryPatch = {}

    if (typeof body.done === 'boolean') {
        patch.done_at = body.done ? new Date().toISOString() : null
    }
    if (body.priority !== undefined) {
        if (!(PRIORITIES as readonly string[]).includes(body.priority)) {
            error(400, 'invalid priority')
        }
        patch.priority = body.priority as Priority
    }
    if (Object.keys(patch).length === 0) {
        error(400, 'nothing to update')
    }

    await updateEntry(locals.supabase, params.id, patch)
    return json(patch)
}

export const DELETE: RequestHandler = async ({ params, locals }) => {
    await deleteEntry(locals.supabase, params.id)
    return new Response(null, { status: 204 })
}
