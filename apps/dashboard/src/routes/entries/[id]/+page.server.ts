import { getEntry } from '@orbit/shared'
import { error } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
    const entry = await getEntry(params.id)
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    return { entry }
}
