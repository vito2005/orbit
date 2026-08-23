import { redirect } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'

// The journal duplicated the inbox, so the root just lands there now — the
// brand mark and old bookmarks still point here.
export const load: PageServerLoad = async () => {
    throw redirect(307, '/inbox')
}
