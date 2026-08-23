import { env } from '@orbit/shared'
import { Elysia } from 'elysia'

import { createBot } from './bot.ts'
import { log } from './log.ts'

async function main() {
    const bot = createBot()

    // Drop any pending updates from a previous run so we don't replay old voices.
    await bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {})

    // Registers the commands in Telegram's own menu, so they are discoverable
    // instead of something the user has to remember.
    await bot.telegram
        .setMyCommands([
            { command: 'dashboard', description: 'Открыть журнал' },
            { command: 'categories', description: 'Мои категории' },
        ])
        .catch((err) => log.error('setMyCommands failed', err))

    const app = new Elysia()
        .get('/', () => ({ ok: true, name: 'orbit-bot' }))
        .get('/health', () => ({ ok: true, ts: new Date().toISOString() }))
        .listen(env.BOT_PORT)

    log.info(`HTTP server listening on :${env.BOT_PORT}`)

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
