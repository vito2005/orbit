import { listTranslations } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
    return { translations: await listTranslations(locals.supabase) }
}
