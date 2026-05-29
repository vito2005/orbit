import {
    archiveEntry,
    CATEGORIES,
    deleteEntry,
    getEntry,
    PRIORITIES,
    scheduleFor,
    setCategory,
    setPriority,
} from '@orbit/shared'
import { error, fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
    const entry = await getEntry(params.id)
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    return { entry }
}

function safeRedirect(data: FormData, fallback: string): string {
    const r = String(data.get('redirectTo') ?? '')
    if (r.startsWith('/') && !r.startsWith('//')) return r
    return fallback
}

export const actions: Actions = {
    archive: async ({ params, request }) => {
        await archiveEntry(params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/'))
    },
    delete: async ({ params, request }) => {
        await deleteEntry(params.id as string)
        const data = await request.formData()
        throw redirect(303, safeRedirect(data, '/'))
    },
    setPriority: async ({ params, request }) => {
        const data = await request.formData()
        const priority = String(data.get('priority') ?? '')
        if (!(PRIORITIES as readonly string[]).includes(priority)) {
            return fail(400, { error: 'invalid priority' })
        }
        await setPriority(params.id as string, priority)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    setCategory: async ({ params, request }) => {
        const data = await request.formData()
        const category = String(data.get('category') ?? '')
        if (!(CATEGORIES as readonly string[]).includes(category)) {
            return fail(400, { error: 'invalid category' })
        }
        await setCategory(params.id as string, category)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
    scheduleFor: async ({ params, request }) => {
        const data = await request.formData()
        const raw = String(data.get('date') ?? '').trim()
        const date = raw.length > 0 ? raw : null
        await scheduleFor(params.id as string, date)
        throw redirect(303, safeRedirect(data, `/entries/${params.id}`))
    },
}
