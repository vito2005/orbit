import {
    consumeTelegramLinkCode,
    createDashboardLoginToken,
    createUserForTelegram,
    env,
    getServiceClient,
    linkTelegramUser,
    resolveTelegramUser,
    TELEGRAM_LOGIN_PAYLOAD,
} from '@orbit/shared'
import { type Context, Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'

import { HELP, HELP_ACTION, helpButton, LINKED, START_HINT, WELCOME } from './about.ts'
import { ClipBlockedError, ClipUnavailableError, parseClipRequest } from './clip.ts'
import { formatSaved, formatTranslation, loginButton } from './format.ts'
import { log } from './log.ts'
import { CLIP_LIMITS, OPERATOR_CLIP_LIMITS, processClip, processText, processVoice } from './process.ts'
import { buildStats } from './stats.ts'

interface BotContext extends Context {
    state: { userId?: string; justCreated?: boolean }
}

// Telegram hands over files up to 20 MB — roughly three hours of speech. That
// bills three times over: Whisper by the second, the transcript by the token,
// and storage forever. Ten minutes is well past any real spoken thought.
const MAX_MEDIA_SECONDS = 600

function tooLongReply(seconds: number): string {
    const minutes = Math.round(seconds / 60)
    return (
        `⚠️ Запись на ${minutes} мин — я беру до ${MAX_MEDIA_SECONDS / 60}. ` +
        'Раздели на части и пришли ещё раз, они сохранятся отдельными записями.'
    )
}

// A capture that fails is a thought the user thinks was saved. Tell them plainly
// what to do — the voice message is still sitting in the chat — and tell the
// operator separately, because nobody reads Railway logs.
const RETRY_HINT: Record<string, string> = {
    voice: '⚠️ Не смог обработать голосовое. Оно осталось в чате — пришли ещё раз.',
    audio: '⚠️ Не смог обработать аудио. Оно осталось в чате — пришли ещё раз.',
    text: '⚠️ Не смог обработать сообщение. Пришли ещё раз.',
    clip: '⚠️ Не смог перевести ролик. Попробуй ещё раз чуть позже.',
    'clip-blocked':
        '⚠️ Площадка сейчас не даёт нашему серверу скачать видео — это их защита от ботов, с роликом всё в порядке. ' +
        'Попробуй позже.',
    'clip-unavailable':
        '⚠️ Не удалось скачать видео — похоже, аккаунт закрытый или у ролика ограничения (возраст, регион). ' +
        'Проверь, открывается ли он без входа в аккаунт: если нет, я его не достану.',
    dashboard: '⚠️ Не смог собрать ссылку на журнал. Попробуй ещё раз.',
}

function clipFailureKind(err: unknown): string {
    if (err instanceof ClipBlockedError) {
        return 'clip-blocked'
    }
    return err instanceof ClipUnavailableError ? 'clip-unavailable' : 'clip'
}

async function reportFailure(bot: Telegraf<BotContext>, ctx: BotContext, kind: string, err: unknown): Promise<void> {
    log.error(`${kind} failed`, err)
    try {
        await ctx.reply(RETRY_HINT[kind] ?? RETRY_HINT.text)
    } catch (replyErr) {
        log.error('failure reply failed', replyErr)
    }

    const adminChatId = env.TELEGRAM_ADMIN_CHAT_ID
    if (!adminChatId) {
        return
    }
    try {
        // Deliberately no transcript or message text — the operator needs to know
        // something broke and for whom, not what the person was saying.
        await bot.telegram.sendMessage(
            adminChatId,
            `🔴 Сбой захвата (${kind})\nuser: ${ctx.state.userId ?? 'не привязан'}\ntg: ${ctx.from?.id ?? '?'}\n\n${(err as Error).message}`,
        )
    } catch (notifyErr) {
        log.error('admin notify failed', notifyErr)
    }
}

export function createBot(): Telegraf<BotContext> {
    const bot = new Telegraf<BotContext>(env.TELEGRAM_BOT_TOKEN)
    const supabase = getServiceClient()

    // Resolve the Telegram user to an account, creating one if this Telegram is
    // new. The bot is the only way to sign up, which is what keeps a person from
    // ending up with two accounts and half their entries in the one they can't see.
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
        // `/start <code>` binds this Telegram to an account that already exists,
        // so it has to run before we create anything — otherwise the fresh
        // account is orphaned the moment the code is consumed. The login payload
        // is not a code: someone arriving that way for the first time still needs
        // an account before they can be sent into one.
        const text = ctx.message && 'text' in ctx.message ? ctx.message.text : ''
        const payload = text.startsWith('/start') ? text.slice('/start'.length).trim() : ''
        if (payload && payload !== TELEGRAM_LOGIN_PAYLOAD) {
            return next()
        }
        ctx.state.userId = await createUserForTelegram(supabase, telegramId, ctx.from?.username)
        ctx.state.justCreated = true
        log.info(`New account from telegram ${telegramId}`)
        await ctx.reply(WELCOME, helpButton)
        return next()
    })

    // A capture reply earns a one-tap way in, so the button carries a session of
    // its own. Minting can fail; losing the button is better than losing the
    // confirmation that the thought was saved.
    async function openButton(userId: string, path: string, label?: string): Promise<ReturnType<typeof loginButton>> {
        try {
            return loginButton(await createDashboardLoginToken(supabase, userId), path, label)
        } catch (err) {
            log.error('entry button failed', err)
            return {}
        }
    }

    // Both the /dashboard command and the site's Telegram button end here.
    async function sendLoginLink(ctx: BotContext): Promise<void> {
        try {
            const token = await createDashboardLoginToken(supabase, ctx.state.userId!)
            const button = loginButton(token)
            if (!button.reply_markup) {
                await ctx.reply('Адрес дашборда не настроен.')
                return
            }
            await ctx.reply('Твой журнал — ссылка работает час:', button)
        } catch (err) {
            await reportFailure(bot, ctx, 'dashboard', err)
        }
    }

    bot.start(async (ctx) => {
        const code = ctx.message.text.slice('/start'.length).trim()
        if (code === TELEGRAM_LOGIN_PAYLOAD) {
            await sendLoginLink(ctx)
            return
        }
        if (!code) {
            // A brand-new account has just been shown WELCOME by the middleware,
            // which already says all of this — no need to say it twice.
            if (!ctx.state.justCreated) {
                await ctx.reply(START_HINT, helpButton)
            }
            return
        }
        const userId = await consumeTelegramLinkCode(supabase, code)
        if (!userId) {
            await ctx.reply('Код не найден или уже использован. Сгенерируй новый в дашборде.')
            return
        }
        await linkTelegramUser(supabase, userId, ctx.from.id)
        await ctx.reply(LINKED, helpButton)
    })

    bot.command('dashboard', (ctx) => sendLoginLink(ctx))

    bot.command('help', (ctx) => ctx.reply(HELP))

    // Anyone else gets silence, not "not allowed" — the command isn't theirs to
    // know about.
    bot.command('stats', async (ctx) => {
        if (!isOperator(ctx)) {
            return
        }
        try {
            await ctx.reply(await buildStats())
        } catch (err) {
            log.error('stats failed', err)
            await ctx.reply('⚠️ Не смог собрать статистику, подробности в логах.')
        }
    })

    bot.action(HELP_ACTION, async (ctx) => {
        await ctx.reply(HELP)
        // A tap older than Telegram's answer window (say, across a restart)
        // can't be acknowledged; the help has already gone out regardless.
        await ctx.answerCbQuery().catch((err) => log.error('help button ack failed', err))
    })

    bot.on(message('voice'), async (ctx) => {
        try {
            if (ctx.message.voice.duration > MAX_MEDIA_SECONDS) {
                await ctx.reply(tooLongReply(ctx.message.voice.duration))
                return
            }
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
            const markup = await openButton(ctx.state.userId!, `/entries/${entry.id}`)
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown', ...markup })
        } catch (err) {
            await reportFailure(bot, ctx, 'voice', err)
        }
    })

    bot.on(message('audio'), async (ctx) => {
        try {
            if (ctx.message.audio.duration > MAX_MEDIA_SECONDS) {
                await ctx.reply(tooLongReply(ctx.message.audio.duration))
                return
            }
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
            const markup = await openButton(ctx.state.userId!, `/entries/${entry.id}`)
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown', ...markup })
        } catch (err) {
            await reportFailure(bot, ctx, 'audio', err)
        }
    })

    async function replyWithTranslation(ctx: BotContext, url: string, messageId: number): Promise<void> {
        try {
            await ctx.reply('🎬 Скачиваю и перевожу — обычно до минуты.')
            await ctx.sendChatAction('typing')
            const limits = isOperator(ctx) ? OPERATOR_CLIP_LIMITS : CLIP_LIMITS
            const outcome = await processClip({ userId: ctx.state.userId!, url, telegramMessageId: messageId, limits })
            if (outcome.kind === 'count-limit') {
                await ctx.reply(`⚠️ Уже ${limits.count} роликов за сутки — это лимит. Пришли этот позже.`)
                return
            }
            if (outcome.kind === 'too-long') {
                const left = Math.floor(outcome.remainingSeconds / 60)
                await ctx.reply(`⚠️ Ролик не влезает в лимит: на сутки осталось ${left} мин из ${limits.seconds / 60}.`)
                return
            }
            if (outcome.kind === 'nothing-to-translate') {
                await ctx.reply('В видео нет ни речи, ни текста — переводить нечего.')
                return
            }
            if (outcome.kind === 'not-english') {
                await ctx.reply('Видео не на английском — разбора не будет. Перевожу только с английского.')
                return
            }
            const coverSent = isInstagram(url) && (await sendCover(ctx, outcome.cover, outcome.translation.title))
            const messages = formatTranslation(outcome.translation, !coverSent)
            const markup = await openButton(
                ctx.state.userId!,
                `/translations/${outcome.translation.id}`,
                '📓 Открыть перевод',
            )
            for (const [index, text] of messages.entries()) {
                const isLast = index === messages.length - 1
                await ctx.reply(text, { parse_mode: 'Markdown', ...(isLast ? markup : {}) })
            }
        } catch (err) {
            await reportFailure(bot, ctx, clipFailureKind(err), err)
        }
    }

    bot.on(message('text'), async (ctx) => {
        const text = ctx.message.text.trim()
        if (text.startsWith('/')) return // unknown command
        const clipUrl = parseClipRequest(text)
        if (clipUrl) {
            await replyWithTranslation(ctx, clipUrl, ctx.message.message_id)
            return
        }
        try {
            await ctx.sendChatAction('typing')
            const entry = await processText({
                userId: ctx.state.userId!,
                text,
                telegramMessageId: ctx.message.message_id,
            })
            const markup = await openButton(ctx.state.userId!, `/entries/${entry.id}`)
            await ctx.reply(formatSaved(entry), { parse_mode: 'Markdown', ...markup })
        } catch (err) {
            await reportFailure(bot, ctx, 'text', err)
        }
    })

    bot.catch((err, ctx) => {
        log.error(`telegraf error for update ${ctx.updateType}`, err)
    })

    return bot
}

function isOperator(ctx: BotContext): boolean {
    return Boolean(env.TELEGRAM_ADMIN_CHAT_ID) && String(ctx.from?.id) === env.TELEGRAM_ADMIN_CHAT_ID
}

// YouTube links already unfurl into a preview in Telegram; Instagram's don't.
function isInstagram(url: string): boolean {
    return new URL(url).hostname.endsWith('instagram.com')
}

// Losing the cover is fine — the translation still goes out, title included.
async function sendCover(ctx: BotContext, cover: Uint8Array, title: string): Promise<boolean> {
    try {
        await ctx.replyWithPhoto({ source: Buffer.from(cover) }, { caption: `🎬 ${title}` })
        return true
    } catch (err) {
        log.error('cover send failed', err)
        return false
    }
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
