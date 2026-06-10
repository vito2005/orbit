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
    motivation: string | null
    extra_context: string | null
}

export type NewEntry = Omit<Entry, 'id' | 'created_at' | 'scheduled_for' | 'done_at' | 'motivation' | 'extra_context'>

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

export interface UserProfile {
    about_me: string
    updated_at: string
}

export interface Resume {
    id: string
    label: string
    content_text: string
    created_at: string
}

export interface AIUsageRow {
    id: string
    model: string
    function_name: string
    prompt_tokens: number
    completion_tokens: number
    cost_usd: number
    created_at: string
}

export interface AIUsageSummary {
    today: number
    week: number
    month: number
    allTime: number
    byFunction: Record<string, { calls: number; cost: number }>
}

export interface StrategyReport {
    id: string
    model: string
    body: string
    created_at: string
}

export interface StrategyContext {
    profile_about_me: string
    resumes: Array<{ label: string; content_text: string }>
    sprint_label: string
    sprint_days_left: number
    counts: {
        backlog: number
        this_week: number
        scheduled_today: number
        done_last_7_days: number
        captured_last_7_days: number
    }
    recent_entries: Array<{
        title: string
        category: string
        priority: string
        created_at: string
        done_at: string | null
        scheduled_for: string | null
        parent_title: string | null
    }>
}
