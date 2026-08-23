function required(name: string): string {
    const value = process.env[name]
    if (!value || value.length === 0) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

function optional(name: string, fallback: string): string {
    const value = process.env[name]
    return value && value.length > 0 ? value : fallback
}

export const env = {
    get TELEGRAM_BOT_TOKEN() {
        return required('TELEGRAM_BOT_TOKEN')
    },
    // Bot username (without @) — used to build the account-linking deep link
    // https://t.me/<username>?start=<code> shown on the dashboard profile page.
    get TELEGRAM_BOT_USERNAME() {
        return optional('TELEGRAM_BOT_USERNAME', '')
    },
    // Numeric Telegram chat id of the operator. When set, the bot forwards
    // capture failures here — Railway logs are not somewhere anyone looks.
    get TELEGRAM_ADMIN_CHAT_ID() {
        return optional('TELEGRAM_ADMIN_CHAT_ID', '')
    },
    // Public address of the dashboard. The bot has no request to derive an origin
    // from, and adapter-node behind a proxy cannot be trusted to compute one, so
    // the deep link in a capture reply and the signup confirmation both read it
    // from here. Trailing slash is stripped on use.
    get PUBLIC_DASHBOARD_URL() {
        return optional('PUBLIC_DASHBOARD_URL', '').replace(/\/+$/, '')
    },
    get OPENAI_API_KEY() {
        return required('OPENAI_API_KEY')
    },
    get OPENAI_TRANSCRIBE_MODEL() {
        return optional('OPENAI_TRANSCRIBE_MODEL', 'whisper-1')
    },
    get OPENAI_CHAT_MODEL() {
        return optional('OPENAI_CHAT_MODEL', 'gpt-4o-mini')
    },
    // Optional: when set + OPENAI_CHAT_MODEL starts with "claude-", chat
    // completions go direct to Anthropic API. Whisper transcription always
    // uses OPENAI_API_KEY regardless.
    get ANTHROPIC_API_KEY() {
        return optional('ANTHROPIC_API_KEY', '')
    },
    // Optional: when set + OPENAI_CHAT_MODEL starts with "claude-", picks a
    // specific Anthropic model. Otherwise OPENAI_CHAT_MODEL is used as-is.
    // Example: claude-sonnet-4-6, claude-opus-4-7, claude-haiku-4-5.
    get ANTHROPIC_CHAT_MODEL() {
        return optional('ANTHROPIC_CHAT_MODEL', '')
    },
    get SUPABASE_URL() {
        return required('SUPABASE_URL')
    },
    get SUPABASE_SERVICE_ROLE_KEY() {
        return required('SUPABASE_SERVICE_ROLE_KEY')
    },
    // Public anon key — the dashboard uses it (with the user's session cookie)
    // so RLS scopes every query to the logged-in user.
    get SUPABASE_ANON_KEY() {
        return required('SUPABASE_ANON_KEY')
    },
    get SUPABASE_STORAGE_BUCKET() {
        return optional('SUPABASE_STORAGE_BUCKET', 'orbit-audio')
    },
    get BOT_PORT() {
        return Number(optional('BOT_PORT', '3001'))
    },
}
