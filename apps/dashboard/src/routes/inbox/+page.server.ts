import { CATEGORIES, listByPriorities, listEntries, PRIORITIES } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals }) => {
    const category = url.searchParams.get('category') ?? ''
    const search = url.searchParams.get('q') ?? ''
    const priority = url.searchParams.get('priority') ?? ''
    const isPriorityFilter = (PRIORITIES as readonly string[]).includes(priority)

    let entries
    if (isPriorityFilter) {
        entries = await listByPriorities(locals.supabase, [priority])
        if (category) entries = entries.filter((e) => e.category === category)
        if (search) {
            const term = search.toLowerCase()
            entries = entries.filter(
                (e) =>
                    e.title.toLowerCase().includes(term) ||
                    e.summary.toLowerCase().includes(term) ||
                    e.transcript.toLowerCase().includes(term),
            )
        }
    } else {
        entries = await listEntries(locals.supabase, {
            category: category || undefined,
            search: search || undefined,
            limit: 200,
        })
        entries = entries.filter((e) => e.priority !== 'archive')
    }

    return {
        entries,
        filters: { category, search, priority },
        categories: CATEGORIES,
    }
}
