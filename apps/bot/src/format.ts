import type { Entry } from '@orbit/shared'

// Both sets on purpose: Russian names seed new accounts, the English ones are
// what existing entries were classified with and must keep their icon.
const CATEGORY_EMOJI: Record<string, string> = {
    работа: '💻',
    личное: '🧠',
    семья: '👨‍👩‍👧',
    здоровье: '🏃',
    деньги: '💰',
    контент: '🎬',
    идеи: '💡',
    разное: '🌀',
    work: '💻',
    '3d': '🎨',
    content: '🎬',
    standup: '🎤',
    family: '👨‍👩‍👧',
    money: '💰',
    health: '🏃',
    ideas: '💡',
    personal: '🧠',
    random: '🌀',
}

export function categoryLabel(c: string): string {
    return `${CATEGORY_EMOJI[c] ?? '•'} ${c}`
}

export function formatSaved(entry: Entry): string {
    const lines = [
        'Сохранено ✅',
        `*Заголовок:* ${escape(entry.title)}`,
        `*Категория:* ${categoryLabel(entry.category)}`,
    ]
    if (entry.next_action) {
        lines.push(`*Следующий шаг:* ${escape(entry.next_action)}`)
    }
    if (entry.tags.length > 0) {
        lines.push(`*Теги:* ${entry.tags.map((t) => `#${escape(t.replace(/\s+/g, '_'))}`).join(' ')}`)
    }
    return lines.join('\n')
}

// Telegram MarkdownV1 — escape only the characters that break parsing
function escape(text: string): string {
    return text.replace(/([*_`[])/g, '\\$1')
}
