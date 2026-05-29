export interface NorthStar {
    label: string
    current: number
    target: number
    unit: string
    primary?: boolean
}

export const NORTH_STARS: NorthStar[] = [
    { label: 'YouTube', current: 200, target: 5000, unit: 'subs', primary: true },
    { label: 'Доход', current: 3000, target: 7500, unit: '$/мес', primary: true },
    { label: 'Twitter', current: 0, target: 1000, unit: 'subs' },
    { label: 'Telegram', current: 0, target: 500, unit: 'subs' },
    { label: 'LinkedIn', current: 0, target: 500, unit: 'subs' },
]

export function progressPct(star: NorthStar): number {
    if (star.target <= 0) return 0
    return Math.min(100, Math.round((star.current / star.target) * 100))
}

export function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
    return String(n)
}
