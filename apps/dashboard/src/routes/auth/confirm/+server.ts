import type { EmailOtpType } from '@supabase/supabase-js'
import { redirect } from '@sveltejs/kit'

import type { RequestHandler } from './$types'

// Supabase sends the email-confirmation / password-reset link here with a
// token_hash. verifyOtp exchanges it for a session, then we land in the app.
export const GET: RequestHandler = async ({ url, locals }) => {
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type') as EmailOtpType | null
    const next = url.searchParams.get('next') ?? '/'

    if (tokenHash && type) {
        const { error } = await locals.supabase.auth.verifyOtp({ token_hash: tokenHash, type })
        if (!error) {
            throw redirect(303, next)
        }
    }
    throw redirect(303, '/login')
}
