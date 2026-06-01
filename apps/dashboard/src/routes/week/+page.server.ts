import {
    bulkDemoteUnscheduledWeek,
    countSubtasksByParent,
    currentSprint,
    generateWeeklyPlan,
    getParentTitles,
    getProfile,
    listResumes,
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
    const parentTitles = await getParentTitles(entries)
    return { entries, sprint, subtaskCounts, parentTitles }
}

export const actions: Actions = {
    demoteAll: async () => {
        const moved = await bulkDemoteUnscheduledWeek()
        throw redirect(303, `/week?moved=${moved}`)
    },
    generateSprint: async () => {
        const [candidates, profile, resumes] = await Promise.all([listSprintCandidates(), getProfile(), listResumes()])
        if (candidates.length === 0) {
            return fail(400, { error: 'Backlog пуст. Скинь идеи в бот.' })
        }
        const sprint = currentSprint()
        const parentTitles = await getParentTitles(candidates)
        const plan = await generateWeeklyPlan(candidates, sprint, profile.about_me, resumes, parentTitles)
        if (plan.selected_ids.length === 0) {
            return fail(500, { error: 'AI не выбрал задачи.' })
        }
        await promoteToWeek(plan.selected_ids)
        return { reasoning: plan.reasoning, picked: plan.selected_ids.length }
    },
}
