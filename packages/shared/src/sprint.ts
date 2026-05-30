import type { Sprint } from './types'

const MONTH_GENITIVE = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
]

function startOfDay(d: Date): Date {
    const r = new Date(d)
    r.setHours(0, 0, 0, 0)
    return r
}

function formatLocalDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function shortLabel(d: Date): string {
    return `${d.getDate()} ${MONTH_GENITIVE[d.getMonth()]}`
}

export function currentSprint(now: Date = new Date()): Sprint {
    const today = startOfDay(now)
    const dow = today.getDay()
    // JS getDay: Sun=0 Mon=1 ... Sat=6. Want Mon as start.
    const daysToMonday = dow === 0 ? -6 : 1 - dow
    const start = new Date(today)
    start.setDate(today.getDate() + daysToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)

    const ms = 1000 * 60 * 60 * 24
    const daysIn = Math.round((today.getTime() - start.getTime()) / ms)
    const daysLeft = Math.max(0, Math.round((end.getTime() - today.getTime()) / ms))

    return {
        start: formatLocalDate(start),
        end: formatLocalDate(end),
        today: formatLocalDate(today),
        daysIn,
        daysLeft,
        label: `${shortLabel(start)} — ${shortLabel(end)}`,
    }
}

export function daysLeftWord(n: number): string {
    if (n === 0) {
        return 'последний день'
    }
    const last = n % 10
    const rest = n % 100
    if (rest >= 11 && rest <= 14) {
        return `осталось ${n} дней`
    }
    if (last === 1) {
        return `остался ${n} день`
    }
    if (last >= 2 && last <= 4) {
        return `осталось ${n} дня`
    }
    return `осталось ${n} дней`
}

export function isStale(entryCreatedAtIso: string, sprint: Sprint): boolean {
    return entryCreatedAtIso.slice(0, 10) < sprint.start
}

export function daysSince(entryCreatedAtIso: string, today: string): number {
    const ms = 1000 * 60 * 60 * 24
    const created = new Date(entryCreatedAtIso.slice(0, 10) + 'T00:00:00')
    const now = new Date(today + 'T00:00:00')
    return Math.max(0, Math.round((now.getTime() - created.getTime()) / ms))
}
