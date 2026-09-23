import { type Entry, env, type Translation } from '@orbit/shared'
import type { InlineKeyboardMarkup } from 'telegraf/types'

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

// Telegram caps a message at 4096 characters; a three-minute interview with
// notes runs past that, so the reply is cut on line boundaries with headroom
// for the escapes.
const MESSAGE_BUDGET = 3500

// withTitle is false when the title already went out as a cover photo's caption.
export function formatTranslation(translation: Translation, withTitle = true): string[] {
    const lines = [
        ...(withTitle ? [`🎬 ${escape(translation.title)}`, ''] : []),
        ...translation.translation.split('\n').map(escape),
    ]
    if (translation.notes.length > 0) {
        lines.push('', '*Что тут не очевидно:*')
        for (const note of translation.notes) {
            lines.push(`• «${escape(note.phrase)}» — ${escape(note.explanation)}`)
        }
    }

    const messages: string[] = []
    let current = ''
    for (const line of lines) {
        if (current && current.length + line.length + 1 > MESSAGE_BUDGET) {
            messages.push(current)
            current = ''
        }
        current = current ? `${current}\n${line}` : line
    }
    messages.push(current)
    return messages
}

// Telegram MarkdownV1 — escape only the characters that break parsing
function escape(text: string): string {
    return text.replace(/([*_`[])/g, '\\$1')
}

// Telegram's in-app browser keeps its own cookies, so a plain link would land
// on the login page rather than the entry. The token carries the session:
// /auth/confirm spends the magiclink hash and forwards to `next`.
export function loginButton(
    token: string,
    next = '',
    label = next ? '📓 Открыть запись' : '📓 Открыть журнал',
): { reply_markup?: InlineKeyboardMarkup } {
    const base = env.PUBLIC_DASHBOARD_URL
    if (!base) {
        return {}
    }
    const params = new URLSearchParams({ token_hash: token, type: 'magiclink' })
    if (next) {
        params.set('next', next)
    }
    return { reply_markup: { inline_keyboard: [[{ text: label, url: `${base}/auth/confirm?${params}` }]] } }
}
