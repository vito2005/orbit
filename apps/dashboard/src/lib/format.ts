// The shipped defaults plus '3d' / 'стендап', which this account added itself —
// an unmapped name still renders, it just falls back to a bullet.
const CATEGORY_EMOJI: Record<string, string> = {
    работа: '💻',
    личное: '🧠',
    семья: '👨‍👩‍👧',
    здоровье: '🏃',
    деньги: '💰',
    контент: '🎬',
    идеи: '💡',
    стендап: '🎤',
    '3d': '🎨',
    разное: '🌀',
}

const PRIORITY_LABEL: Record<string, string> = {
    backlog: '🗂 бэклог',
    archive: '📦 архив',
}

// Energy is stored as low/medium/high — an enum the DB and the AI agree on — so
// it is translated on the way out rather than in the data.
const ENERGY_LABEL: Record<string, string> = {
    low: 'низкая',
    medium: 'средняя',
    high: 'высокая',
}

export function energyLabel(e: string): string {
    return ENERGY_LABEL[e] ?? e
}

export function categoryEmoji(c: string): string {
    return CATEGORY_EMOJI[c] ?? '•'
}

export function priorityLabel(p: string): string {
    return PRIORITY_LABEL[p] ?? p
}

export function formatDate(iso: string): string {
    const d = new Date(iso)
    // Explicit locale: these render during SSR too, where the server's locale
    // would otherwise decide the month name.
    return d.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function formatRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) {
        return 'только что'
    }
    if (m < 60) {
        return `${m} мин назад`
    }
    const h = Math.floor(m / 60)
    if (h < 24) {
        return `${h} ч назад`
    }
    const d = Math.floor(h / 24)
    if (d < 7) {
        return `${d} дн назад`
    }
    return formatDate(iso)
}
