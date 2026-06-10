import {
    countOpenInPriority,
    currentSprint,
    deleteStrategyReport,
    generateStrategy,
    getParentTitles,
    getProfile,
    listEntries,
    listResumes,
    listScheduledFor,
    listStrategyReports,
    saveStrategyReport,
    type StrategyContext,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

function todayLocal(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const load: PageServerLoad = async () => {
    const reports = await listStrategyReports(10)
    return { reports }
}

export const actions: Actions = {
    generate: async () => {
        const sprint = currentSprint()
        const [profile, resumes, backlogCount, weekCount, todayEntries, recent] = await Promise.all([
            getProfile(),
            listResumes(),
            countOpenInPriority('later'),
            countOpenInPriority('this_week'),
            listScheduledFor(todayLocal()),
            listEntries({ sinceDays: 14, limit: 60 }),
        ])

        const parentTitles = await getParentTitles(recent)

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const last7 = recent.filter((e) => new Date(e.created_at).getTime() >= sevenDaysAgo)
        const done7 = recent.filter((e) => e.done_at && new Date(e.done_at).getTime() >= sevenDaysAgo)

        const context: StrategyContext = {
            profile_about_me: profile.about_me,
            resumes: resumes.map((r) => ({ label: r.label, content_text: r.content_text })),
            sprint_label: sprint.label,
            sprint_days_left: sprint.daysLeft,
            counts: {
                backlog: backlogCount,
                this_week: weekCount,
                scheduled_today: todayEntries.length,
                done_last_7_days: done7.length,
                captured_last_7_days: last7.length,
            },
            recent_entries: recent.slice(0, 40).map((e) => ({
                title: e.title,
                category: e.category,
                priority: e.priority,
                created_at: e.created_at,
                done_at: e.done_at,
                scheduled_for: e.scheduled_for,
                parent_title: e.parent_id ? (parentTitles[e.parent_id] ?? null) : null,
            })),
        }

        try {
            const strat = await generateStrategy(context)
            if (!strat.body) {
                return fail(500, { error: 'AI вернул пустой ответ.' })
            }
            await saveStrategyReport({ model: strat.model, body: strat.body })
        } catch (err) {
            return fail(500, { error: `AI ошибка: ${(err as Error).message}` })
        }
        throw redirect(303, '/strategy?generated=1')
    },
    delete: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) {
            return fail(400, { error: 'missing id' })
        }
        await deleteStrategyReport(id)
        throw redirect(303, '/strategy')
    },
}
