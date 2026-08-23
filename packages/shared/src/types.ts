// Categories are per-user (user_profile.categories). This list only seeds a new
// account and acts as the fallback when a profile row is missing.
export const DEFAULT_CATEGORIES = [
    'работа',
    'личное',
    'семья',
    'здоровье',
    'деньги',
    'контент',
    'идеи',
    'разное',
] as const

// Not a union: the valid set is whatever the owner configured.
export type Category = string

export const PRIORITIES = ['backlog', 'archive'] as const
export type Priority = (typeof PRIORITIES)[number]

export const ENERGIES = ['low', 'medium', 'high'] as const
export type Energy = (typeof ENERGIES)[number]

export type EntryType = 'voice' | 'text'

export interface AIAnalysis {
    title: string
    summary: string
    category: Category
    tags: string[]
    next_action: string | null
    energy: Energy
    content_potential: number | null
}

export interface Entry {
    id: string
    user_id: string
    created_at: string
    telegram_message_id: string | null
    type: EntryType
    original_audio_url: string | null
    transcript: string
    title: string
    summary: string
    category: Category
    tags: string[]
    next_action: string | null
    priority: Priority
    energy: Energy
    content_potential: number | null
    raw_ai_json: AIAnalysis
    done_at: string | null
    parent_id: string | null
    motivation: string | null
}

// user_id is optional: the bot sets it explicitly (service-role), while dashboard
// inserts leave it to the DB default (auth.uid()).
export type NewEntry = Omit<Entry, 'id' | 'user_id' | 'created_at' | 'done_at' | 'motivation'> & {
    user_id?: string
}

// The columns an entry can change after capture. Narrower than Partial<Entry>
// so a patch can't touch id / user_id / the AI's original analysis.
export type EntryPatch = Partial<Pick<Entry, 'priority' | 'category' | 'motivation' | 'done_at'>>

export interface UserProfile {
    user_id: string
    categories: string[]
    updated_at: string
}

export interface TelegramLink {
    user_id: string
    telegram_id: number
    created_at: string
}
