import { listWeek } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const entries = await listWeek()
    return { entries }
}
