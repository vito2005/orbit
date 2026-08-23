import { type Entry, listAllEntries } from '@orbit/shared'

import type { RequestHandler } from './$types'

// Prepended to the Markdown export on request, so the file can be pasted
// straight into any chat model. This is what /strategy used to do in-app.
const AI_PROMPT = `Ниже — полный дамп моих идей, заметок и задач.
Прочитай всё целиком, прежде чем отвечать, и опирайся на транскрипты, а не только на заголовки.

Что мне нужно:
1. Повторяющиеся темы — к чему я возвращаюсь снова и снова, сам того не замечая.
2. Незакрытые петли — то, что я начал и бросил.
3. Что можно выкинуть без сожалений.
4. Одна вещь, на которой стоит сосредоточиться в ближайший месяц, и почему именно она.

Будь конкретным и опирайся на мои формулировки. Не подбадривай — мне нужен честный разбор.

---

`

function formatEntry(entry: Entry, index: number): string {
    const meta = [
        entry.created_at.slice(0, 10),
        entry.category,
        entry.priority,
        `energy: ${entry.energy}`,
        entry.type === 'voice' ? '🎤 голосовая' : '📝 текст',
        entry.done_at ? `✓ выполнено ${entry.done_at.slice(0, 10)}` : null,
    ]
        .filter(Boolean)
        .join(' · ')

    const parts = [`## ${index}. ${entry.title}`, '', meta, '']
    if (entry.tags.length > 0) {
        parts.push(`Теги: ${entry.tags.map((t) => `#${t}`).join(' ')}`, '')
    }
    if (entry.next_action) {
        parts.push(`**Следующий шаг:** ${entry.next_action}`, '')
    }
    if (entry.summary) {
        parts.push(`**Кратко:** ${entry.summary}`, '')
    }
    // The whole point of the export: the untouched transcript, not the AI's summary.
    parts.push('**Транскрипт:**', '', entry.transcript, '')
    return parts.join('\n')
}

export const GET: RequestHandler = async ({ url, locals }) => {
    const format = url.searchParams.get('format') === 'md' ? 'md' : 'json'
    const withPrompt = url.searchParams.get('prompt') === '1'

    const entries = await listAllEntries(locals.supabase)
    const today = new Date().toISOString().slice(0, 10)
    const filename = `orbit-export-${today}.${format}`

    let body: string
    let contentType: string

    if (format === 'md') {
        const header = [`# Orbit — экспорт от ${today}`, '', `Записей: ${entries.length}`, '', '---', '']
        body =
            (withPrompt ? AI_PROMPT : '') +
            header.join('\n') +
            '\n' +
            entries.map((entry, i) => formatEntry(entry, i + 1)).join('\n---\n\n')
        contentType = 'text/markdown; charset=utf-8'
    } else {
        body = JSON.stringify(
            {
                exported_at: new Date().toISOString(),
                entry_count: entries.length,
                entries: entries.map(({ user_id: _user_id, ...entry }) => entry),
            },
            null,
            2,
        )
        contentType = 'application/json; charset=utf-8'
    }

    return new Response(body, {
        headers: {
            'content-type': contentType,
            'content-disposition': `attachment; filename="${filename}"`,
        },
    })
}
