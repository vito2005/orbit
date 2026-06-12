import {
    archiveEntry,
    countOpenInPriority,
    countSubtasksByParent,
    getParentTitles,
    listNow,
    listRecent,
    listStale,
    markDone,
    setPriority,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const [entries, stale, recent, backlogCount] = await Promise.all([
        listNow(60),
        listStale(14, 40),
        listRecent(5),
        countOpenInPriority('later'),
    ])

    const parentIds = new Set<string>()
    for (const e of [...entries, ...stale]) {
        if (e.parent_id) parentIds.add(e.parent_id)
    }
    const allWithParents = [...entries, ...stale]
    const parentTitles = await getParentTitles(allWithParents)
    const subtaskCountsMap = await countSubtasksByParent(entries.map((e) => e.id))
    const subtaskCounts: Record<string, { total: number; done: number }> = {}
    for (const [k, v] of subtaskCountsMap) {
        subtaskCounts[k] = v
    }

    return {
        entries,
        stale,
        recent,
        parentTitles,
        subtaskCounts,
        backlogCount,
    }
}

export const actions: Actions = {
    done: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) return fail(400, { error: 'missing id' })
        await markDone(id, true)
        throw redirect(303, '/')
    },
    archive: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) return fail(400, { error: 'missing id' })
        await archiveEntry(id)
        throw redirect(303, '/')
    },
    promote: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        const priority = String(data.get('priority') ?? 'now')
        if (!id) return fail(400, { error: 'missing id' })
        await setPriority(id, priority)
        throw redirect(303, '/')
    },
}
