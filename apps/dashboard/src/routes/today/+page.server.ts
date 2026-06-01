import {
    generateDailyPlan,
    getDailyPlan,
    getParentTitles,
    getProfile,
    listPlanCandidates,
    listResumes,
    listScheduledFor,
    markDone,
    saveDailyPlan,
    scheduleEntries,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

function localDate(offsetDays = 0): string {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export const load: PageServerLoad = async () => {
    const today = localDate(0)
    const tomorrow = localDate(1)
    const [todayEntries, todayPlan, tomorrowEntries, tomorrowPlan] = await Promise.all([
        listScheduledFor(today),
        getDailyPlan(today),
        listScheduledFor(tomorrow),
        getDailyPlan(tomorrow),
    ])
    const parentTitles = await getParentTitles([...todayEntries, ...tomorrowEntries])
    return {
        today: { date: today, entries: todayEntries, plan: todayPlan },
        tomorrow: { date: tomorrow, entries: tomorrowEntries, plan: tomorrowPlan },
        parentTitles,
    }
}

export const actions: Actions = {
    generate: async ({ request }) => {
        const data = await request.formData()
        const target = String(data.get('target') ?? 'today')
        const offset = target === 'tomorrow' ? 1 : 0
        const date = localDate(offset)

        const [candidates, profile, resumes] = await Promise.all([listPlanCandidates(), getProfile(), listResumes()])
        if (candidates.length === 0) {
            return fail(400, { error: 'Нет задач в now / this_week — пополни инбокс.' })
        }
        const parentTitles = await getParentTitles(candidates)
        const plan = await generateDailyPlan(candidates, date, profile.about_me, resumes, parentTitles)
        if (plan.selected_ids.length === 0) {
            return fail(500, { error: 'AI не выбрал ни одной задачи.' })
        }
        await scheduleEntries(plan.selected_ids, date)
        await saveDailyPlan({
            date,
            reasoning: plan.reasoning,
            entry_ids: plan.selected_ids,
            explanations: plan.explanations,
        })
        return { reasoning: plan.reasoning, target }
    },
    done: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        const done = data.get('done') === '1'
        if (!id) {
            return fail(400, { error: 'missing id' })
        }
        await markDone(id, done)
        throw redirect(303, '/today')
    },
}
