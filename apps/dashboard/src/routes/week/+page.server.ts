import {
    currentSprint,
    daysSince,
    deleteWeekPlan,
    generateWeekPlan,
    getProfile,
    listByPriorities,
    listResumes,
    listStrategyReports,
    listWeekPlans,
    saveWeekPlan,
    type WeekPlanContext,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const [plans, latestStrategy] = await Promise.all([listWeekPlans(10), listStrategyReports(1)])
    return { plans, hasStrategy: latestStrategy.length > 0 }
}

export const actions: Actions = {
    generate: async () => {
        const sprint = currentSprint()
        const [profile, resumes, strategies, backlog] = await Promise.all([
            getProfile(),
            listResumes(),
            listStrategyReports(1),
            listByPriorities(['backlog']),
        ])

        const openBacklog = backlog
            .filter((e) => e.done_at === null)
            .slice(0, 80)
            .map((e) => ({
                title: e.title,
                category: e.category,
                age_days: daysSince(e.created_at, sprint.today),
            }))

        const context: WeekPlanContext = {
            profile_about_me: profile.about_me,
            resumes: resumes.map((r) => ({ label: r.label, content_text: r.content_text })),
            daily_hours: profile.daily_hours,
            week_label: sprint.label,
            week_days_left: sprint.daysLeft,
            latest_strategy: strategies[0] ? strategies[0].body.slice(0, 3000) : null,
            open_backlog: openBacklog,
        }

        try {
            const plan = await generateWeekPlan(context)
            if (!plan.body) {
                return fail(500, { error: 'AI вернул пустой ответ.' })
            }
            await saveWeekPlan({
                model: plan.model,
                body: plan.body,
                week_start: sprint.start,
                system_prompt: plan.system_prompt,
                user_content: plan.user_content,
            })
        } catch (err) {
            return fail(500, { error: `AI ошибка: ${(err as Error).message}` })
        }
        throw redirect(303, '/week?generated=1')
    },
    delete: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) {
            return fail(400, { error: 'missing id' })
        }
        await deleteWeekPlan(id)
        throw redirect(303, '/week')
    },
}
