const CATEGORY_EMOJI: Record<string, string> = {
    work: '💻',
    '3d': '🎨',
    content: '🎬',
    standup: '🎤',
    family: '👨‍👩‍👧',
    money: '💰',
    health: '🏃',
    personal: '🧠',
    random: '🌀',
}

const PRIORITY_LABEL: Record<string, string> = {
    now: '🔥 now',
    this_week: '📅 this week',
    later: '🕓 later',
    archive: '📦 archive',
}

export function categoryEmoji(c: string): string {
    return CATEGORY_EMOJI[c] ?? '•'
}

export function priorityLabel(p: string): string {
    return PRIORITY_LABEL[p] ?? p
}

export function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
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
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return formatDate(iso)
}
