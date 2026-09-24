import { env } from '@orbit/shared'
import { Elysia } from 'elysia'

import { COMMANDS, OPERATOR_COMMANDS, PROFILE_DESCRIPTION, PROFILE_SHORT_DESCRIPTION } from './about.ts'
import { createBot } from './bot.ts'
import { scheduleYtDlpUpdates } from './clip.ts'
import { log } from './log.ts'

async function main() {
    const bot = createBot()

    // Drop any pending updates from a previous run so we don't replay old voices.
    await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {})

    // The command menu and the profile texts are set from about.ts on every
    // start, so what Telegram shows can't drift from what the bot does.
    await bot.telegram.setMyCommands(COMMANDS).catch((err) => log.error('setMyCommands failed', err))
    if (env.TELEGRAM_ADMIN_CHAT_ID) {
        await bot.telegram
            .setMyCommands(OPERATOR_COMMANDS, { scope: { type: 'chat', chat_id: Number(env.TELEGRAM_ADMIN_CHAT_ID) } })
            .catch((err) => log.error('operator setMyCommands failed', err))
    }
    await bot.telegram.setMyDescription(PROFILE_DESCRIPTION).catch((err) => log.error('setMyDescription failed', err))
    await bot.telegram
        .setMyShortDescription(PROFILE_SHORT_DESCRIPTION)
        .catch((err) => log.error('setMyShortDescription failed', err))

    const app = new Elysia()
        .get('/', () => ({ ok: true, name: 'orbit-bot' }))
        .get('/health', () => ({ ok: true, ts: new Date().toISOString() }))
        .listen(env.BOT_PORT)

    log.info(`HTTP server listening on :${env.BOT_PORT}`)

    scheduleYtDlpUpdates()

    await bot.launch()
    log.info('Telegram bot launched (long polling)')

    const shutdown = (signal: string) => {
        log.info(`Received ${signal}, shutting down`)
        bot.stop(signal)
        app.stop?.()
        process.exit(0)
    }
    process.once('SIGINT', () => shutdown('SIGINT'))
    process.once('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch((err) => {
    log.error('Fatal startup error', err)
    process.exit(1)
})
