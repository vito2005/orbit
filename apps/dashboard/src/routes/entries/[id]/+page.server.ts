import { archiveEntry, deleteEntry, getEntry } from '@orbit/shared'
import { error, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params }) => {
    const entry = await getEntry(params.id)
    if (!entry) {
        throw error(404, 'Entry not found')
    }
    return { entry }
}

export const actions: Actions = {
    archive: async ({ params }) => {
        await archiveEntry(params.id as string)
        throw redirect(303, '/')
    },
    delete: async ({ params }) => {
        await deleteEntry(params.id as string)
        throw redirect(303, '/')
    },
}
