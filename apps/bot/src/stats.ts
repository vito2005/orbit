import { getServiceClient } from '@orbit/shared'

const DAY_MS = 24 * 60 * 60 * 1000

// Measured on real clips: Whisper plus gpt-5.4-mini come to 1.5–2 cents per
// minute of video. An estimate — per-call token counts aren't stored.
const CLIP_CENTS_PER_MINUTE = 1.7

interface Row {
    user_id: string
    created_at: string
}

// Counts only, never content: the operator sees how the bot is used, not what
// anyone wrote or watched. Windows are rolling (24 h / 7 d / 30 d) so there is
// no timezone to argue about.
export async function buildStats(): Promise<string> {
    const supabase = getServiceClient()
    const now = Date.now()
    const monthAgo = new Date(now - 30 * DAY_MS).toISOString()

    const [links, entries, translations] = await Promise.all([
        supabase.from('telegram_links').select('user_id, created_at'),
        supabase.from('entries').select('user_id, created_at, type').gte('created_at', monthAgo),
        supabase
            .from('translations')
            .select('user_id, created_at, duration_seconds, source_url')
            .gte('created_at', monthAgo),
    ])
    for (const result of [links, entries, translations]) {
        if (result.error) {
            throw new Error(`Stats query failed: ${result.error.message}`)
        }
    }
    const users = (links.data ?? []) as Row[]
    const entryRows = (entries.data ?? []) as (Row & { type: string })[]
    const clipRows = (translations.data ?? []) as (Row & { duration_seconds: number; source_url: string })[]

    const within = <T extends Row>(rows: T[], days: number): T[] =>
        rows.filter((row) => now - new Date(row.created_at).getTime() < days * DAY_MS)
    const people = (rows: Row[]): number => new Set(rows.map((row) => row.user_id)).size
    const minutes = (rows: { duration_seconds: number }[]): number =>
        Math.round(rows.reduce((sum, row) => sum + row.duration_seconds, 0) / 60)

    const activity = (days: number): number => people([...within(entryRows, days), ...within(clipRows, days)])

    const entries7 = within(entryRows, 7)
    const clips7 = within(clipRows, 7)
    const youtube7 = clips7.filter((row) => row.source_url.includes('youtube')).length
    const clipCost30 = (minutes(clipRows) * CLIP_CENTS_PER_MINUTE) / 100

    return [
        '📊 Orbit — статистика',
        '',
        `👥 Пользователи: ${users.length}, новых за 7 дн: ${within(users, 7).length}`,
        `Активных: 24 ч — ${activity(1)}, 7 дн — ${activity(7)}, 30 дн — ${activity(30)}`,
        '',
        `📝 Заметки: 24 ч — ${within(entryRows, 1).length}, 7 дн — ${entries7.length}, 30 дн — ${entryRows.length}`,
        `За 7 дн: голос — ${entries7.filter((row) => row.type === 'voice').length}, ` +
            `текст — ${entries7.filter((row) => row.type === 'text').length}`,
        '',
        `🎬 Переводы: 24 ч — ${within(clipRows, 1).length}, 7 дн — ${clips7.length}, 30 дн — ${clipRows.length}`,
        `За 7 дн: ${minutes(clips7)} мин, Instagram — ${clips7.length - youtube7}, YouTube — ${youtube7}, ` +
            `людей — ${people(clips7)}`,
        '',
        `💸 Переводы за 30 дн ≈ $${clipCost30.toFixed(2)} (оценка по минутам)`,
    ].join('\n')
}
