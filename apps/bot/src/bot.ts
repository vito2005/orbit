import {
    CATEGORIES,
    consumeTelegramLinkCode,
    env,
    getServiceClient,
    linkTelegramUser,
    resolveTelegramUser,
} from '@orbit/shared'
import { type Context, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'

import { categoryLabel, formatSaved } from './format.ts'
import { log } from './log.ts'
import { processText, processVoice } from './process.ts'

interface BotContext extends Context {
    state: { userId?: string }
}

export function createBot(): Telegraf<BotContext> {
    const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN)
    const supabase = getServiceClient()

    // Resolve the Telegram user to a linked account. Linked → carry the user id
    // on ctx.state. Unlinked → only /start (to bind a code) is allowed through.
    bot.use(async (ctx, next) => {
        const telegramId = ctx.from?.id
        if (!telegramId) {
            return
        }
        const userId = await resolveTelegramUser(supabase, telegramId)
        if (userId) {
            ctx.state.userId = userId
            return next()
        }
        const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
        if (text.startsWith('/start')) {
            return next()
        }
        await ctx.reply('Аккаунт не привязан. Открой дашборд → Профиль → Подключить Telegram и перейди по ссылке.')
    })

    bot.start(async (ctx) => {
        if (ctx.state.userId) {
            await ctx.reply('👋 Аккаунт уже привязан. Присылай голос или текст.')
            return
        }
        const code = ctx.message.text.split(' ').slice(1).join(' ').trim()
        if (!code) {
            await ctx.reply('Привет! Чтобы привязать аккаунт, зайди в дашборд → Профиль → Подключить Telegram.')
            return
        }
        const userId = await consumeTelegramLinkCode(supabase, code)
        if (!userId) {
            await ctx.reply('Код не найден или уже использован. Сгенерируй новый в дашборде.')
            return
        }
        await linkTelegramUser(supabase, userId, ctx.from.id)
        await ctx.reply('✅ Аккаунт привязан. Присылай голос или текст — я сохраню в твой журнал.')
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
                userId: ctx.state.userId!,
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
                userId: ctx.state.userId!,
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
                userId: ctx.state.userId!,
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
