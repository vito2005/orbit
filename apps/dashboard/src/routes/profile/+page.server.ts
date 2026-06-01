import { getProfile, saveProfile } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const profile = await getProfile()
    return { profile }
}

export const actions: Actions = {
    save: async ({ request }) => {
        const data = await request.formData()
        const aboutMe = String(data.get('about_me') ?? '').trim()
        if (aboutMe.length > 50000) {
            return fail(400, { error: 'Слишком длинно (макс 50000 символов).' })
        }
        await saveProfile(aboutMe)
        throw redirect(303, '/profile?saved=1')
    },
}
