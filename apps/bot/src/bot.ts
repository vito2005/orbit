import { CATEGORIES, env } from '@orbit/shared'
import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'

import { categoryLabel, formatSaved } from './format.ts'
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
                '/categories — список категорий',
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
