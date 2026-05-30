export const CATEGORIES = [
    'work',
    '3d',
    'content',
    'standup',
    'family',
    'money',
    'health',
    'personal',
    'random',
] as const

export type Category = (typeof CATEGORIES)[number]

export const PRIORITIES = ['now', 'this_week', 'later', 'archive'] as const
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
    priority: Priority
    energy: Energy
    content_potential: number | null
}

export interface Entry {
    id: string
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
    scheduled_for: string | null
    done_at: string | null
    parent_id: string | null
}

export type NewEntry = Omit<Entry, 'id' | 'created_at' | 'scheduled_for' | 'done_at'>

export interface DailyPlan {
    date: string
    reasoning: string
    entry_ids: string[]
    explanations: Record<string, string>
    created_at: string
}

export interface Sprint {
    start: string
    end: string
    today: string
    daysIn: number
    daysLeft: number
    label: string
}
