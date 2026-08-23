import { createTelegramLinkCode, env, getProfile, getTelegramLink, saveCategories, unlinkTelegram } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
    const [profile, telegramLink] = await Promise.all([getProfile(locals.supabase), getTelegramLink(locals.supabase)])
    return {
        profile,
        telegramLink,
        botUsername: env.TELEGRAM_BOT_USERNAME,
    }
}

export const actions: Actions = {
    addCategory: async ({ request, locals }) => {
        const data = await request.formData()
        // Lowercase and collapse spaces so the AI's output and the stored list
        // cannot drift apart on casing alone.
        const name = String(data.get('category') ?? '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')
        if (name.length === 0 || name.length > 24) {
            return fail(400, { error: 'Название от 1 до 24 символов.' })
        }
        const { categories } = await getProfile(locals.supabase)
        if (categories.includes(name)) {
            return fail(400, { error: 'Такая категория уже есть.' })
        }
        if (categories.length >= 20) {
            return fail(400, { error: 'Больше 20 категорий модель уже не различает.' })
        }
        await saveCategories(locals.supabase, [...categories, name])
        throw redirect(303, '/profile?cats=1')
    },
    removeCategory: async ({ request, locals }) => {
        const data = await request.formData()
        const name = String(data.get('category') ?? '')
        const { categories } = await getProfile(locals.supabase)
        if (categories.length <= 1) {
            return fail(400, { error: 'Хотя бы одна категория нужна — иначе AI нечего выбирать.' })
        }
        await saveCategories(
            locals.supabase,
            categories.filter((c) => c !== name),
        )
        throw redirect(303, '/profile?cats=1')
    },
    connectTelegram: async ({ locals }) => {
        const code = await createTelegramLinkCode(locals.supabase, locals.user!.id)
        throw redirect(303, `/profile?tg_code=${code}`)
    },
    unlinkTelegram: async ({ locals }) => {
        await unlinkTelegram(locals.supabase, locals.user!.id)
        throw redirect(303, '/profile?tg_unlinked=1')
    },
}
