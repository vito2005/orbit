import { countOpenInPriority, currentSprint, listRecent, listTodayPlan, listWeek } from '@orbit/shared'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async () => {
    const [today, week, recent, backlogCount] = await Promise.all([
        listTodayPlan(),
        listWeek(),
        listRecent(5),
        countOpenInPriority('later'),
    ])

    const todayOpen = today.filter((e) => !e.done_at)
    const todayDone = today.filter((e) => e.done_at)

    return {
        today: { open: todayOpen, done: todayDone },
        weekOpenCount: week.length,
        backlogCount,
        recent,
        sprint: currentSprint(),
    }
}
