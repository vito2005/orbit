import { listRecent } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
    const recent = await listRecent(locals.supabase, 20)
    return { recent }
}
