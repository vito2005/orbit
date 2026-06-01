import OpenAI, { toFile } from 'openai'

import { env } from './env'
import type { Resume, Sprint } from './types'
import {
    type AIAnalysis,
    CATEGORIES,
    type Category,
    ENERGIES,
    type Energy,
    type Entry,
    PRIORITIES,
    type Priority,
} from './types'

let cached: OpenAI | null = null

function client(): OpenAI {
    if (cached) return cached
    cached = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    return cached
}

export async function transcribeAudio(audio: ArrayBuffer | Uint8Array, fileName: string): Promise<string> {
    const bytes = audio instanceof Uint8Array ? audio : new Uint8Array(audio)
    const file = await toFile(bytes, fileName, {
        type: guessContentType(fileName),
    })
    const result = await client().audio.transcriptions.create({
        file,
        model: env.OPENAI_TRANSCRIBE_MODEL,
    })
    return result.text.trim()
}

export function guessContentType(fileName: string): string {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.ogg') || lower.endsWith('.oga')) return 'audio/ogg'
    if (lower.endsWith('.mp3')) return 'audio/mpeg'
    if (lower.endsWith('.m4a')) return 'audio/mp4'
    if (lower.endsWith('.wav')) return 'audio/wav'
    if (lower.endsWith('.webm')) return 'audio/webm'
    return 'application/octet-stream'
}

const SYSTEM_PROMPT = `You are a personal life-inbox assistant. The user sends raw thoughts in any language (often Russian). You must analyze the transcript and return STRICT JSON with this exact shape:

{
  "title": string,             // <= 80 chars, in the SAME language as input
  "summary": string,           // 1-3 sentences in the SAME language as input
  "category": one of: ${CATEGORIES.map((c) => `"${c}"`).join(', ')},
  "tags": string[],            // 2-6 short lowercase tags
  "next_action": string|null,  // a concrete next step if obvious, else null
  "priority": one of: ${PRIORITIES.map((p) => `"${p}"`).join(', ')},
  "energy": one of: ${ENERGIES.map((e) => `"${e}"`).join(', ')},
  "content_potential": number|null  // 1-10 if it could become a reels/post/video, else null
}

User context (use for category disambiguation and content_potential scoring, NOT for priority):
- Primary career vector: high-paid frontend / Three.js / creative engineering (international market). Programming is the main axis — work / 3d tasks deserve precise categorization.
- Primary content channel: YouTube (long-form videos about Three.js / frontend / creative tech). Three.js / frontend / shader / WebGL demo ideas → content_potential 7-10. Personal vlog / random thoughts → 1-4.

Categorization rules:
- Reels/video/post/YouTube/Instagram/social media idea => "content"
- Programming/work task/code/career/job interviews => "work"
- Three.js, WebGL, 3D graphics, Bruno Simon course => "3d"
- Joke, comedy observation, standup material => "standup"
- Wife, kid, parents, household => "family"
- Income, expenses, offers, salary, debts, investments => "money"
- Sport, sleep, food, mental health => "health"
- If uncertain => "personal" or "random"

Priority rules (be CONSERVATIVE — sprint planning happens separately):
- "Сегодня", "срочно", explicit today/tomorrow deadline => "now"
- ONLY if user explicitly says "на этой неделе", "до пятницы", "к концу недели" => "this_week"
- DEFAULT for ideas/tasks without explicit time-bound urgency => "later" (they go to backlog; user decides sprint inclusion separately)
- Vent / done / informational only => "archive"

Return JSON only. No prose, no markdown fences.`

export async function analyze(transcript: string): Promise<AIAnalysis> {
    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: transcript },
        ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(`AI returned non-JSON: ${raw.slice(0, 200)}`)
    }
    return normalizeAnalysis(parsed, transcript)
}

function normalizeAnalysis(input: unknown, transcript: string): AIAnalysis {
    const obj = (input ?? {}) as Record<string, unknown>

    const category = (CATEGORIES as readonly string[]).includes(obj.category as string)
        ? (obj.category as Category)
        : 'random'

    const priority = (PRIORITIES as readonly string[]).includes(obj.priority as string)
        ? (obj.priority as Priority)
        : 'later'

    const energy = (ENERGIES as readonly string[]).includes(obj.energy as string) ? (obj.energy as Energy) : 'medium'

    const tags = Array.isArray(obj.tags)
        ? (obj.tags as unknown[])
              .map((t) => String(t).toLowerCase().trim())
              .filter((t) => t.length > 0)
              .slice(0, 8)
        : []

    const cp =
        typeof obj.content_potential === 'number' && Number.isFinite(obj.content_potential)
            ? Math.max(1, Math.min(10, Math.round(obj.content_potential as number)))
            : null

    const fallbackTitle =
        transcript
            .split(/\n|\.|!|\?/)[0]
            ?.trim()
            .slice(0, 80) || 'Untitled'

    return {
        title:
            typeof obj.title === 'string' && obj.title.trim().length > 0
                ? (obj.title as string).slice(0, 120)
                : fallbackTitle,
        summary: typeof obj.summary === 'string' ? (obj.summary as string) : '',
        category,
        tags,
        next_action:
            typeof obj.next_action === 'string' && obj.next_action.trim().length > 0
                ? (obj.next_action as string)
                : null,
        priority,
        energy,
        content_potential: cp,
    }
}

const RESUME_TOTAL_BUDGET = 6000
const RESUME_PER_ITEM_BUDGET = 2500

function buildResumesBlock(resumes?: Resume[]): string {
    if (!resumes || resumes.length === 0) {
        return ''
    }
    const parts: string[] = []
    let used = 0
    for (const r of resumes) {
        const remaining = RESUME_TOTAL_BUDGET - used
        if (remaining <= 200) {
            break
        }
        const slice = r.content_text.trim().slice(0, Math.min(remaining, RESUME_PER_ITEM_BUDGET))
        if (slice.length === 0) {
            continue
        }
        parts.push(`Resume "${r.label}":\n${slice}`)
        used += slice.length
    }
    if (parts.length === 0) {
        return ''
    }
    return `\n\nResumes (the user has uploaded ${parts.length} resume version${parts.length > 1 ? 's' : ''} tailored for different roles — read all of them together to understand the user's full experience, do NOT pick one over another):\n\n${parts.join('\n\n---\n\n')}`
}

function buildContext(profile?: string, resumes?: Resume[]): string {
    let s = NORTH_STARS
    const profileText = (profile ?? '').trim().slice(0, 2500)
    if (profileText.length > 0) {
        s += `\n\nAbout the user (free-form profile they wrote — treat as ground truth about their background, skills, current life situation):\n${profileText}`
    }
    s += buildResumesBlock(resumes)
    return s
}

const NORTH_STARS = `User's north stars for the next 1-2 years:
- Career axis: high-paid frontend / creative engineering / 3D engineer (international market)
- Income: from $3k/month → $7.5k/month (~$90k/year)
- YouTube subscribers: from 200 → 5000 (primary content channel; long-form videos about Three.js / frontend)
- Three.js course (Bruno Simon) to be completed — directly serves the 3D career axis
- Secondary content channels: Twitter (as YouTube distributor), LinkedIn (recruiter outreach), Telegram (RU audience)
- Constraint: work takes ~6h/day weekdays; smart work also enables promotion ($3k → $4k by year-end at current job)

Time budget (very important — pick task SIZES that fit):
- Weekdays: ~3-4h of focused time available for tasks outside the day job (family of small kid, married — evening slots are split). Fits one deep task (~1.5h) plus 1-2 medium ones (30-45 min each).
- Weekends: more flexible — Sunday especially can accommodate 2 larger tasks (Three.js chunks, content shoot, deep work). Saturday is family-heavy but still has solid 2-3h windows.
- Day-of-week awareness: if today is Friday → keep it light, weekend coming. If today is Sunday → can pick 1-2 ambitious creative tasks. If today is Monday → ramp up, don't overload.
- Never schedule more than 5 tasks for a single day. 3-4 is the sweet spot.`

export interface DailyPlanSelection {
    selected_ids: string[]
    reasoning: string
    explanations: Record<string, string>
}

const WEEKDAY_RU = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

export async function generateDailyPlan(
    candidates: Entry[],
    targetDate?: string,
    profile?: string,
    resumes?: Resume[],
): Promise<DailyPlanSelection> {
    if (candidates.length === 0) {
        return { selected_ids: [], reasoning: 'No unscheduled tasks in this_week or now.', explanations: {} }
    }

    const dateStr = targetDate ?? new Date().toISOString().slice(0, 10)
    const dateObj = new Date(dateStr + 'T00:00:00')
    const dayName = WEEKDAY_RU[dateObj.getDay()]
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6

    const compact = candidates.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        priority: e.priority,
        next_action: e.next_action,
        energy: e.energy,
        tags: e.tags,
    }))

    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: `You are a personal planning assistant. Given a pool of the user's tasks and their north stars, pick 3-5 tasks for the SPECIFIC day below. Balance categories — don't pick only work, or only content. Prefer tasks that move north stars (3d, content, work-promotion, money). Avoid picking energy="high" for more than 1-2 items.

Planning for: ${dateStr} (${dayName}, ${isWeekend ? 'weekend — more time' : 'weekday — tight ~1-2h slot'}).

${buildContext(profile, resumes)}

Return STRICT JSON:
{
  "selected_ids": string[],         // 3-5 entry ids from the pool, ordered by what to do first
  "reasoning": string,              // 1-2 sentences in Russian: overall theme of the day, referencing the day-of-week constraint
  "explanations": {                 // one entry per selected id
    "<entry_id>": string            // 1 sentence in Russian: why THIS task on THIS specific day
  }
}

Return JSON only. No prose, no fences.`,
            },
            {
                role: 'user',
                content: JSON.stringify(compact, null, 2),
            },
        ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(`AI plan returned non-JSON: ${raw.slice(0, 200)}`)
    }
    const obj = (parsed ?? {}) as Record<string, unknown>
    const validIds = new Set(candidates.map((c) => c.id))
    const selected = Array.isArray(obj.selected_ids)
        ? (obj.selected_ids as unknown[]).map(String).filter((id) => validIds.has(id))
        : []
    const selectedTrimmed = selected.slice(0, 5)
    const selectedSet = new Set(selectedTrimmed)
    const rawExplanations = (obj.explanations ?? {}) as Record<string, unknown>
    const explanations: Record<string, string> = {}
    for (const id of selectedTrimmed) {
        const v = rawExplanations[id]
        if (typeof v === 'string' && v.trim().length > 0) {
            explanations[id] = v
        }
    }
    // Drop stray explanations for ids that weren't actually picked.
    for (const k of Object.keys(rawExplanations)) {
        if (!selectedSet.has(k)) {
            delete explanations[k]
        }
    }
    return {
        selected_ids: selectedTrimmed,
        reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
        explanations,
    }
}

export interface WeeklyPlanSelection {
    selected_ids: string[]
    reasoning: string
}

export async function generateWeeklyPlan(
    candidates: Entry[],
    sprint: Sprint,
    profile?: string,
    resumes?: Resume[],
): Promise<WeeklyPlanSelection> {
    if (candidates.length === 0) {
        return { selected_ids: [], reasoning: 'Backlog пуст.' }
    }

    // Scale target count by days remaining in the sprint.
    // 0 days left → 1-2 tasks. 6 days left → 9-11. 7 days (fresh Monday) → 10-12.
    const targetMin = Math.max(1, Math.round(1 + sprint.daysLeft * 1.3))
    const targetMax = Math.max(2, Math.round(2 + sprint.daysLeft * 1.6))
    const isShortRunway = sprint.daysLeft <= 2

    const compact = candidates.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        priority: e.priority,
        next_action: e.next_action,
        energy: e.energy,
        tags: e.tags,
    }))

    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        messages: [
            {
                role: 'system',
                content: `You help the user plan a WEEKLY SPRINT (Mon-Sun). From the backlog pool below, pick a SCALED number of tasks to commit to for the remaining days in the sprint. Balance categories — don't pick only work, or only content. Strongly prefer tasks that move the career axis (work, 3d) and the primary content channel (YouTube). Account for the time budget below.

${buildContext(profile, resumes)}

Sprint window: ${sprint.label}.
Days remaining in sprint: ${sprint.daysLeft} (0 = last day today, 6-7 = fresh start of week).

Target number of tasks: ${targetMin}-${targetMax}.
${isShortRunway ? '⚠ Sprint is almost over — pick tightly. Few realistic items, not a wishlist.' : ''}

Selection rules:
- ${targetMin}-${targetMax} tasks total. If the pool is small, pick whatever makes sense within that count.
- ~40% should serve the career axis (work / 3d). ~25% content. The rest fuel (health, family, standup, money).
- Avoid stacking 3+ "deep" tasks when the sprint has few days left — daily plan needs flexibility.
- Don't pick obviously archived/done topics.

Return STRICT JSON:
{
  "selected_ids": string[],     // ${targetMin}-${targetMax} entry ids from the pool
  "reasoning": string           // 2-3 sentences in Russian: theme of the week, why this count fits the remaining days, why picks serve the career axis
}

Return JSON only. No prose, no fences.`,
            },
            {
                role: 'user',
                content: JSON.stringify(compact, null, 2),
            },
        ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(`AI weekly plan returned non-JSON: ${raw.slice(0, 200)}`)
    }
    const obj = (parsed ?? {}) as Record<string, unknown>
    const validIds = new Set(candidates.map((c) => c.id))
    const selected = Array.isArray(obj.selected_ids)
        ? (obj.selected_ids as unknown[])
              .map(String)
              .filter((id) => validIds.has(id))
              .slice(0, targetMax)
        : []
    return {
        selected_ids: selected,
        reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    }
}

export async function generateMotivation(
    entry: Entry,
    parent: Entry | null = null,
    profile?: string,
    resumes?: Resume[],
): Promise<string> {
    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        temperature: 0.6,
        messages: [
            {
                role: 'system',
                content: `You write motivational reasoning for one specific long-term task. Goal: in 3-5 sentences IN RUSSIAN, explain WHY this task matters — connect to north stars, name the concrete reward on a realistic timeline, and end with what's lost by dropping it.

Tone rules:
- Direct and slightly emotional. NO flattery ("ты молодец", "у тебя получится", "ты сможешь").
- Honest about effort and the path, not aspirational fluff.
- Reference SPECIFIC north stars when relevant (career axis, YouTube subs, income, Three.js course).
- Estimate a realistic outcome window ("через 2-3 месяца", "к концу спринта", etc.).
- End with a sentence about the COST of dropping it (lost momentum, opportunity, etc.).

${buildContext(profile, resumes)}

Return plain text. No JSON, no markdown headers, no quotes — just the motivation paragraph.`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    title: entry.title,
                    summary: entry.summary,
                    transcript: entry.transcript.slice(0, 1500),
                    next_action: entry.next_action,
                    category: entry.category,
                    tags: entry.tags,
                    parent: parent
                        ? {
                              title: parent.title,
                              motivation: parent.motivation,
                          }
                        : null,
                }),
            },
        ],
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    return raw.trim()
}

export interface SubtaskSuggestion {
    title: string
    next_action: string | null
}

export async function suggestSubtasks(
    entry: Entry,
    profile?: string,
    resumes?: Resume[],
): Promise<SubtaskSuggestion[]> {
    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0.4,
        messages: [
            {
                role: 'system',
                content: `You help break down one large task into 3-6 concrete subtasks. Each subtask should:
- Take roughly 30-90 minutes of focused work
- Have a clear, narrow scope (one chapter, one PR, one section, one shoot)
- Be doable independently — they can be picked in any order
- Be in the SAME language as the parent task (usually Russian)

${buildContext(profile, resumes)}

Return STRICT JSON:
{
  "subtasks": [
    {
      "title": string,            // <= 80 chars, in same language as parent
      "next_action": string|null  // concrete first step, optional
    }
  ]
}

Return JSON only. No prose, no fences.`,
            },
            {
                role: 'user',
                content: JSON.stringify({
                    title: entry.title,
                    summary: entry.summary,
                    transcript: entry.transcript.slice(0, 2000),
                    next_action: entry.next_action,
                    category: entry.category,
                    tags: entry.tags,
                }),
            },
        ],
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(`AI subtasks returned non-JSON: ${raw.slice(0, 200)}`)
    }
    const obj = (parsed ?? {}) as Record<string, unknown>
    const rawSubs = Array.isArray(obj.subtasks) ? obj.subtasks : []
    return rawSubs
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
            title: typeof s.title === 'string' ? s.title.slice(0, 120) : '',
            next_action: typeof s.next_action === 'string' && s.next_action.trim().length > 0 ? s.next_action : null,
        }))
        .filter((s) => s.title.length > 0)
        .slice(0, 6)
}

export async function weeklyReview(entries: Entry[]): Promise<string> {
    if (entries.length === 0) {
        return 'No entries in the last 7 days yet.'
    }

    const compact = entries.map((e) => ({
        created_at: e.created_at,
        category: e.category,
        priority: e.priority,
        title: e.title,
        summary: e.summary,
        next_action: e.next_action,
        tags: e.tags,
    }))

    const completion = await client().chat.completions.create({
        model: env.OPENAI_CHAT_MODEL,
        temperature: 0.5,
        messages: [
            {
                role: 'system',
                content: `You are a concise weekly coach. Given a list of the user's entries from the last 7 days, produce a short Russian-language review with these sections (use plain text, no markdown headings beyond bold):

*Главные темы недели* — 3-5 bullets
*Незавершённые важные идеи* — bullets, mention category
*Фокус на следующую неделю* — 1 short paragraph
*Топ-3 next actions* — numbered list, each item is a concrete action

Keep it under ~250 words.`,
            },
            {
                role: 'user',
                content: JSON.stringify(compact, null, 2),
            },
        ],
    })

    return completion.choices[0]?.message?.content?.trim() ?? 'Could not generate review.'
}
