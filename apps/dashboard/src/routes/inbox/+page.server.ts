import { getProfile, listByPriorities, listEntries, listTags, PRIORITIES } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ url, locals }) => {
    const category = url.searchParams.get('category') ?? ''
    const search = url.searchParams.get('q') ?? ''
    const priority = url.searchParams.get('priority') ?? ''
    const tag = url.searchParams.get('tag') ?? ''
    const doneParam = url.searchParams.get('done') ?? ''
    const done = doneParam === '1' ? true : doneParam === '0' ? false : undefined
    const isPriorityFilter = (PRIORITIES as readonly string[]).includes(priority)

    let entries
    if (isPriorityFilter) {
        entries = await listByPriorities(locals.supabase, [priority])
        if (category) entries = entries.filter((e) => e.category === category)
        if (tag) entries = entries.filter((e) => e.tags.includes(tag))
        if (done !== undefined) entries = entries.filter((e) => (e.done_at !== null) === done)
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
            tag: tag || undefined,
            done,
            limit: 200,
        })
        entries = entries.filter((e) => e.priority !== 'archive')
    }

    return {
        entries,
        tags: await listTags(locals.supabase),
        filters: { category, search, priority, tag, done: doneParam },
        categories: (await getProfile(locals.supabase)).categories,
    }
}
