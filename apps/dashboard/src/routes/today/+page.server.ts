import { generateDailyPlan, listPlanCandidates, listTodayPlan, markDone, scheduleEntries } from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const entries = await listTodayPlan()
    return { entries }
}

export const actions: Actions = {
    generate: async () => {
        const candidates = await listPlanCandidates()
        if (candidates.length === 0) {
            return fail(400, { error: 'Нет задач в now / this_week — пополни инбокс.' })
        }
        const plan = await generateDailyPlan(candidates)
        if (plan.selected_ids.length === 0) {
            return fail(500, { error: 'AI не выбрал ни одной задачи.' })
        }
        const today = new Date().toISOString().slice(0, 10)
        await scheduleEntries(plan.selected_ids, today)
        return { reasoning: plan.reasoning }
    },
    done: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        const done = data.get('done') === '1'
        if (!id) return fail(400, { error: 'missing id' })
        await markDone(id, done)
        throw redirect(303, '/today')
    },
    unschedule: async ({ request }) => {
        const data = await request.formData()
        const id = String(data.get('id') ?? '')
        if (!id) return fail(400, { error: 'missing id' })
        await scheduleEntries([id], null)
        throw redirect(303, '/today')
    },
}
