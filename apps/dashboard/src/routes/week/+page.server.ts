import {
    bulkDemoteUnscheduledWeek,
    countSubtasksByParent,
    currentSprint,
    generateWeeklyPlan,
    listSprintCandidates,
    listWeek,
    promoteToWeek,
} from '@orbit/shared'
import { fail, redirect } from '@sveltejs/kit'

import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const entries = await listWeek()
    const sprint = currentSprint()
    const subtaskCountsMap = await countSubtasksByParent(entries.map((e) => e.id))
    const subtaskCounts: Record<string, { total: number; done: number }> = {}
    for (const [k, v] of subtaskCountsMap) {
        subtaskCounts[k] = v
    }
    return { entries, sprint, subtaskCounts }
}

export const actions: Actions = {
    demoteAll: async () => {
        const moved = await bulkDemoteUnscheduledWeek()
        throw redirect(303, `/week?moved=${moved}`)
    },
    generateSprint: async () => {
        const candidates = await listSprintCandidates()
        if (candidates.length === 0) {
            return fail(400, { error: 'Backlog пуст. Скинь идеи в бот.' })
        }
        const sprint = currentSprint()
        const plan = await generateWeeklyPlan(candidates, sprint)
        if (plan.selected_ids.length === 0) {
            return fail(500, { error: 'AI не выбрал задачи.' })
        }
        await promoteToWeek(plan.selected_ids)
        return { reasoning: plan.reasoning, picked: plan.selected_ids.length }
    },
}
