import type { Entry } from '@orbit/shared'

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

const PRIORITY_EMOJI: Record<string, string> = {
    now: '🔥',
    this_week: '📅',
    later: '🕓',
    archive: '📦',
}

export function categoryLabel(c: string): string {
    return `${CATEGORY_EMOJI[c] ?? '•'} ${c}`
}

export function priorityLabel(p: string): string {
    return `${PRIORITY_EMOJI[p] ?? '•'} ${p}`
}

export function formatSaved(entry: Entry): string {
    const lines = [
        'Saved ✅',
        `*Title:* ${escape(entry.title)}`,
        `*Category:* ${categoryLabel(entry.category)}`,
        `*Priority:* ${priorityLabel(entry.priority)}`,
    ]
    if (entry.next_action) {
        lines.push(`*Next action:* ${escape(entry.next_action)}`)
    }
    if (entry.tags.length > 0) {
        lines.push(`*Tags:* ${entry.tags.map((t) => `#${escape(t.replace(/\s+/g, '_'))}`).join(' ')}`)
    }
    return lines.join('\n')
}

export function formatEntryShort(entry: Entry): string {
    const head = `${categoryLabel(entry.category)} *${escape(entry.title)}*`
    const action = entry.next_action ? `\n  ↳ ${escape(entry.next_action)}` : ''
    return `${head}${action}`
}

export function formatList(entries: Entry[], emptyMsg: string): string {
    if (entries.length === 0) return emptyMsg
    return entries.map((e) => formatEntryShort(e)).join('\n\n')
}

// Telegram MarkdownV1 — escape only the characters that break parsing
function escape(text: string): string {
    return text.replace(/([*_`[])/g, '\\$1')
}
