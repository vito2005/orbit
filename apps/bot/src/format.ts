import { type Entry, env } from '@orbit/shared'
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

// Telegram MarkdownV1 — escape only the characters that break parsing
function escape(text: string): string {
    return text.replace(/([*_`[])/g, '\\$1')
}

// Telegram's in-app browser keeps its own cookies, so a plain link would land
// on the login page rather than the entry. The token carries the session:
// /auth/confirm spends the magiclink hash and forwards to `next`.
export function loginButton(token: string, next = ''): { reply_markup?: InlineKeyboardMarkup } {
    const base = env.PUBLIC_DASHBOARD_URL
    if (!base) {
        return {}
    }
    const params = new URLSearchParams({ token_hash: token, type: 'magiclink' })
    if (next) {
        params.set('next', next)
    }
    const label = next ? '📓 Открыть запись' : '📓 Открыть журнал'
    return { reply_markup: { inline_keyboard: [[{ text: label, url: `${base}/auth/confirm?${params}` }]] } }
}
