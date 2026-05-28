import { CATEGORIES, env, listByPriorities, listEntries, weeklyReview } from '@orbit/shared'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'

import { categoryLabel, formatList, formatSaved, priorityLabel } from './format.ts'
import { log } from './log.ts'
import { processText, processVoice } from './process.ts'

export function createBot(): Telegraf {
    const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN)

    // Single-user lock: silently ignore anyone but the configured user.
    bot.use(async (ctx, next) => {
        const userId = ctx.from?.id
        if (userId !== env.TELEGRAM_ALLOWED_USER_ID) {
            log.warn(`Rejected message from unauthorized user ${userId}`)
            return
        }
        return next()
    })

    bot.start(async (ctx) => {
        await ctx.reply(
            [
                "👋 Hi! I'm Orbit — your voice-first idea inbox.",
                '',
                "Send me a *voice message* or *text* and I'll transcribe, categorize and save it.",
                '',
                'Commands:',
                '/today — entries marked `now` and `this_week`',
                '/week — AI summary of the last 7 days',
                '/categories — list categories',
            ].join('\n'),
            { parse_mode: 'Markdown' },
        )
    })

    bot.command('categories', async (ctx) => {
        const lines = CATEGORIES.map((c) => `• ${categoryLabel(c)}`)
        await ctx.reply(`*Categories:*\n${lines.join('\n')}`, {
            parse_mode: 'Markdown',
        })
    })

    bot.command('today', async (ctx) => {
        try {
            const entries = await listByPriorities(['now', 'this_week'])
            const grouped: Record<string, typeof entries> = { now: [], this_week: [] }
            for (const e of entries) {
                grouped[e.priority]?.push(e)
            }
            const parts: string[] = []
            if (grouped.now.length > 0) {
                parts.push(`${priorityLabel('now')}\n${formatList(grouped.now, '')}`)
            }
            if (grouped.this_week.length > 0) {
                parts.push(`${priorityLabel('this_week')}\n${formatList(grouped.this_week, '')}`)
            }
            await ctx.reply(parts.length > 0 ? parts.join('\n\n') : 'Nothing urgent right now. 🌿', {
                parse_mode: 'Markdown',
            })
        } catch (err) {
            log.error('today failed', err)
            await ctx.reply("Failed to load today's entries.")
        }
    })

    bot.command('week', async (ctx) => {
        try {
            await ctx.sendChatAction('typing')
            const entries = await listEntries({ sinceDays: 7, limit: 200 })
            const summary = await weeklyReview(entries)
            await ctx.reply(summary, { parse_mode: 'Markdown' })
        } catch (err) {
            log.error('week failed', err)
            await ctx.reply('Failed to build weekly review.')
        }
    })

    bot.on(message('voice'), async (ctx) => {
        try {
            await ctx.sendChatAction('typing')
            const fileId = ctx.message.voice.file_id
            const link = await ctx.telegram.getFileLink(fileId)
            const res = await fetch(link.toString())
            if (!res.ok) throw new Error(`Telegram file fetch ${res.status}`)
            const buf = await res.arrayBuffer()

            const ext = fileNameFromUrl(link.toString())
            const entry = await processVoice({
                fileBytes: buf,
                telegramFileName: ext,
                telegramMessageId: ctx.message.message_id,
            })
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown' })
        } catch (err) {
            log.error('voice failed', err)
            await ctx.reply(`⚠ Failed to process voice: ${(err as Error).message}`)
        }
    })

    bot.on(message('audio'), async (ctx) => {
        try {
            await ctx.sendChatAction('typing')
            const fileId = ctx.message.audio.file_id
            const link = await ctx.telegram.getFileLink(fileId)
            const res = await fetch(link.toString())
            if (!res.ok) throw new Error(`Telegram file fetch ${res.status}`)
            const buf = await res.arrayBuffer()

            const entry = await processVoice({
                fileBytes: buf,
                telegramFileName: ctx.message.audio.file_name ?? fileNameFromUrl(link.toString()),
                telegramMessageId: ctx.message.message_id,
            })
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown' })
        } catch (err) {
            log.error('audio failed', err)
            await ctx.reply(`⚠ Failed to process audio: ${(err as Error).message}`)
        }
    })

    bot.on(message('text'), async (ctx) => {
        const text = ctx.message.text.trim()
        if (text.startsWith('/')) return // unknown command
        try {
            await ctx.sendChatAction('typing')
            const entry = await processText({
                text,
                telegramMessageId: ctx.message.message_id,
            })
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown' })
        } catch (err) {
            log.error('text failed', err)
            await ctx.reply(`⚠ Failed to process: ${(err as Error).message}`)
        }
    })

    bot.catch((err, ctx) => {
        log.error(`telegraf error for update ${ctx.updateType}`, err)
    })

    return bot
}

function fileNameFromUrl(url: string): string {
    try {
        const u = new URL(url)
        const last = u.pathname.split('/').pop()
        return last && last.length > 0 ? last : 'voice.ogg'
    } catch {
        return 'voice.ogg'
    }
}
