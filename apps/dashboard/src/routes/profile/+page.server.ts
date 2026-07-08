import {
    addResume,
    deleteResume,
    getProfile,
    listResumes,
    saveDailyHours,
    saveProfile,
    updateResume,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import { extractPdfText } from '$lib/pdf'

import type { Actions, PageServerLoad } from './$types'

const HOURS_OPTIONS = [0.5, 1, 1.5, 2, 3, 4]

export const load: PageServerLoad = async () => {
    const [profile, resumes] = await Promise.all([getProfile(), listResumes()])
    return { profile, resumes, hoursOptions: HOURS_OPTIONS }
}

export const actions: Actions = {
    saveHours: async ({ request }) => {
        const data = await request.formData()
        const hours = Number(data.get('daily_hours'))
        if (!HOURS_OPTIONS.includes(hours)) {
            return fail(400, { error: 'Выбери значение из списка.' })
        }
        await saveDailyHours(hours)
        throw redirect(303, '/profile?hours_saved=1')
    },
    save: async ({ request }) => {
        const data = await request.formData()
        const aboutMe = String(data.get('about_me') ?? '').trim()
        if (aboutMe.length > 50000) {
            return fail(400, { error: 'Слишком длинно (макс 50000 символов).' })
        }
        await saveProfile(aboutMe)
        throw redirect(303, '/profile?saved=1')
    },
    uploadResume: async ({ request }) => {
        const data = await request.formData()
        const label = String(data.get('label') ?? '').trim()
        const file = data.get('pdf') as File | null
        if (!label) {
            return fail(400, { error: 'Дай резюме название (например, «Senior FE для Vercel»).' })
        }
        if (!file || file.size === 0) {
            return fail(400, { error: 'Прикрепи PDF-файл.' })
        }
        if (file.size > 10 * 1024 * 1024) {
            return fail(400, { error: 'PDF больше 10MB — слишком много.' })
        }
        let text: string
        try {
            const bytes = await file.arrayBuffer()
            text = await extractPdfText(bytes)
        } catch (err) {
            return fail(400, { error: `Не смог распарсить PDF: ${(err as Error).message}` })
        }
        if (text.length === 0) {
            return fail(400, { error: 'PDF распарсился, но текста не нашлось — возможно скан без OCR.' })
        }
        await addResume({ label, contentText: text })
        throw redirect(303, '/profile?resume_added=1')
    },
    updateResume: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        const label = String(data.get('label') ?? '').trim()
        const contentText = String(data.get('content_text') ?? '').trim()
        if (!id) {
            return fail(400, { error: 'missing id' })
        }
        await updateResume(id, { label, contentText })
        throw redirect(303, '/profile?resume_updated=1')
    },
    deleteResume: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) {
            return fail(400, { error: 'missing id' })
        }
        await deleteResume(id)
        throw redirect(303, '/profile?resume_deleted=1')
    },
}
