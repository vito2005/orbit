import {
    countOpenInPriority,
    currentSprint,
    deleteStrategyReport,
    generateStrategy,
    getParentTitles,
    getProfile,
    listEntries,
    listResumes,
    listStale,
    listStrategyReports,
    saveStrategyReport,
    type StrategyContext,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const reports = await listStrategyReports(10)
    return { reports }
}

export const actions: Actions = {
    generate: async () => {
        const sprint = currentSprint()
        const [profile, resumes, backlogCount, stale, recent] = await Promise.all([
            getProfile(),
            listResumes(),
            countOpenInPriority('backlog'),
            listStale(14, 100),
            listEntries({ limit: 1000 }),
        ])

        const parentTitles = await getParentTitles(recent)

        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
        const last7 = recent.filter((e) => new Date(e.created_at).getTime() >= sevenDaysAgo)
        const done7 = recent.filter((e) => e.done_at && new Date(e.done_at).getTime() >= sevenDaysAgo)

        const context: StrategyContext = {
            profile_about_me: profile.about_me,
            resumes: resumes.map((r) => ({ label: r.label, content_text: r.content_text })),
            daily_hours: profile.daily_hours,
            sprint_label: sprint.label,
            sprint_days_left: sprint.daysLeft,
            counts: {
                backlog: backlogCount,
                stale_over_14_days: stale.length,
                done_last_7_days: done7.length,
                captured_last_7_days: last7.length,
            },
            recent_entries: recent.map((e) => ({
                title: e.title,
                category: e.category,
                priority: e.priority,
                created_at: e.created_at,
                done_at: e.done_at,
                parent_title: e.parent_id ? (parentTitles[e.parent_id] ?? null) : null,
            })),
        }

        try {
            const strat = await generateStrategy(context)
            if (!strat.body) {
                return fail(500, { error: 'AI вернул пустой ответ.' })
            }
            await saveStrategyReport({
                model: strat.model,
                body: strat.body,
                system_prompt: strat.system_prompt,
                user_content: strat.user_content,
            })
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
