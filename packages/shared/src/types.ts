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
    extra_context: string | null
}

export type NewEntry = Omit<Entry, 'id' | 'created_at' | 'done_at' | 'motivation' | 'extra_context'>

// Mon-Sun calendar week — kept as context input for /strategy so the AI knows
// where in the week the user is when reasoning about focus.
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
    daily_hours: number
    updated_at: string
}

export interface Resume {
    id: string
    label: string
    content_text: string
    created_at: string
}

export interface StrategyReport {
    id: string
    model: string
    body: string
    created_at: string
    system_prompt: string
    user_content: string
}

export interface WeekPlan {
    id: string
    model: string
    body: string
    week_start: string
    created_at: string
    system_prompt: string
    user_content: string
}

export interface WeekPlanContext {
    profile_about_me: string
    resumes: Array<{ label: string; content_text: string }>
    daily_hours: number
    week_label: string
    week_days_left: number
    latest_strategy: string | null
    open_backlog: Array<{
        title: string
        category: string
        age_days: number
    }>
}

export interface StrategyContext {
    profile_about_me: string
    resumes: Array<{ label: string; content_text: string }>
    daily_hours: number
    sprint_label: string
    sprint_days_left: number
    counts: {
        backlog: number
        stale_over_14_days: number
        done_last_7_days: number
        captured_last_7_days: number
    }
    recent_entries: Array<{
        title: string
        category: string
        priority: string
        created_at: string
        done_at: string | null
        parent_title: string | null
    }>
}
