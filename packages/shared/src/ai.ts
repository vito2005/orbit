import OpenAI, { toFile } from 'openai'

import { env } from './env'
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

Categorization rules:
- Reels/video/post/YouTube/Instagram/social media idea => "content"
- Programming/work task/code/career/job interviews => "work"
- Three.js, WebGL, 3D graphics, Bruno Simon course => "3d"
- Joke, comedy observation, standup material => "standup"
- Wife, kid, parents, household => "family"
- Income, expenses, offers, salary, debts, investments => "money"
- Sport, sleep, food, mental health => "health"
- If uncertain => "personal" or "random"

Priority rules:
- Urgent today / explicitly today => "now"
- Should happen within a week => "this_week"
- Vague, someday, low urgency => "later"
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

const NORTH_STARS = `User's north stars for the next 1-2 years:
- Career axis: high-paid frontend / creative engineering / 3D engineer (international market)
- Income: from $3k/month → $7.5k/month (~$90k/year)
- YouTube subscribers: from 200 → 5000 (primary content channel; long-form videos about Three.js / frontend)
- Three.js course (Bruno Simon) to be completed — directly serves the 3D career axis
- Secondary content channels: Twitter (as YouTube distributor), LinkedIn (recruiter outreach), Telegram (RU audience)
- Constraint: work takes 8h/day weekdays; protect personal-projects time, but smart work also enables promotion ($3k → $4k by year-end at current job)`

export interface DailyPlanSelection {
    selected_ids: string[]
    reasoning: string
}

export async function generateDailyPlan(candidates: Entry[]): Promise<DailyPlanSelection> {
    if (candidates.length === 0) {
        return { selected_ids: [], reasoning: 'No unscheduled tasks in this_week or now.' }
    }

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
                content: `You are a personal planning assistant. Given a pool of the user's tasks and their north stars, pick 3-5 tasks to do TODAY. Balance categories — don't pick only work, or only content. Prefer tasks that move north stars (3d, content, work-promotion, money). Avoid picking energy="high" for more than 1-2 items.

${NORTH_STARS}

Return STRICT JSON:
{
  "selected_ids": string[],   // 3-5 entry ids from the pool
  "reasoning": string         // 1-2 sentences in Russian, explaining the choice
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
    return {
        selected_ids: selected.slice(0, 5),
        reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    }
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
