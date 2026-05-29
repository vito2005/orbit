import { listWeek, scheduleEntries } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const entries = await listWeek()
    return { entries }
}

export const actions: Actions = {
    planForToday: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) return fail(400, { error: 'missing id' })
        const today = new Date().toISOString().slice(0, 10)
        await scheduleEntries([id], today)
        throw redirect(303, '/week')
    },
}
