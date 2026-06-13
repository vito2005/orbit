import { listRecent } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const recent = await listRecent(20)
    return { recent }
}
