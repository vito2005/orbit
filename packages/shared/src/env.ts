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
    get TELEGRAM_ALLOWED_USER_ID() {
        return Number(required('TELEGRAM_ALLOWED_USER_ID'))
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
    get SUPABASE_URL() {
        return required('SUPABASE_URL')
    },
    get SUPABASE_SERVICE_ROLE_KEY() {
        return required('SUPABASE_SERVICE_ROLE_KEY')
    },
    get SUPABASE_STORAGE_BUCKET() {
        return optional('SUPABASE_STORAGE_BUCKET', 'orbit-audio')
    },
    get DASHBOARD_PASSWORD() {
        return optional('DASHBOARD_PASSWORD', 'changeme')
    },
    get WEB_PUSH_VAPID_PUBLIC_KEY() {
        return optional('WEB_PUSH_VAPID_PUBLIC_KEY', '')
    },
    get WEB_PUSH_VAPID_PRIVATE_KEY() {
        return optional('WEB_PUSH_VAPID_PRIVATE_KEY', '')
    },
    get WEB_PUSH_VAPID_SUBJECT() {
        return optional('WEB_PUSH_VAPID_SUBJECT', 'mailto:orbit@example.com')
    },
    get BOT_PORT() {
        return Number(optional('BOT_PORT', '3001'))
    },
}
