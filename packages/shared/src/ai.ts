import Anthropic from '@anthropic-ai/sdk'
import OpenAI, { toFile } from 'openai'

import { env } from './env'
import type { Resume, StrategyContext, UserProfile, WeekPlanContext } from './types'
import { type AIAnalysis, CATEGORIES, type Category, ENERGIES, type Energy, type Entry } from './types'

let openaiCached: OpenAI | null = null
let anthropicCached: Anthropic | null = null

function openaiClient(): OpenAI {
    if (openaiCached) return openaiCached
    openaiCached = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    return openaiCached
}

function anthropicClient(): Anthropic {
    if (anthropicCached) return anthropicCached
    if (!env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY is not set — required to use claude-* models.')
    }
    anthropicCached = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
    return anthropicCached
}

function isAnthropicModel(model: string): boolean {
    return model.toLowerCase().startsWith('claude-')
}

// Resolved chat model — env.OPENAI_CHAT_MODEL may say "claude-sonnet-4-6" too;
// alternatively ANTHROPIC_CHAT_MODEL overrides specifically for Anthropic.
function resolveChatModel(): string {
    if (env.ANTHROPIC_CHAT_MODEL && env.ANTHROPIC_API_KEY) {
        return env.ANTHROPIC_CHAT_MODEL
    }
    return env.OPENAI_CHAT_MODEL
}

// Normalized chat response — both providers map to this shape so call sites
// don't care which one they hit.
interface NormalizedChatResult {
    text: string
    promptTokens: number
    completionTokens: number
    model: string
}

interface NormalizedChatParams {
    model?: string
    systemMessage: string
    userContent: string
    jsonMode?: boolean
    temperature?: number
}

async function chatCompletion(params: NormalizedChatParams, _functionName: string): Promise<NormalizedChatResult> {
    const model = params.model ?? resolveChatModel()
    return isAnthropicModel(model) ? await callAnthropic({ ...params, model }) : await callOpenAI({ ...params, model })
}

async function callOpenAI(params: NormalizedChatParams & { model: string }): Promise<NormalizedChatResult> {
    const completion = await openaiClient().chat.completions.create({
        model: params.model,
        ...(params.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
        temperature: params.temperature ?? 0.3,
        messages: [
            { role: 'system', content: params.systemMessage },
            { role: 'user', content: params.userContent },
        ],
    })
    const text = completion.choices[0]?.message?.content ?? ''
    return {
        text,
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        model: params.model,
    }
}

async function callAnthropic(params: NormalizedChatParams & { model: string }): Promise<NormalizedChatResult> {
    // Anthropic: system is top-level. JSON mode is not native — we instruct in the
    // prompt and strip any markdown code fences after.
    const systemPrompt = params.jsonMode
        ? `${params.systemMessage}\n\nIMPORTANT: respond with VALID JSON only. No markdown fences, no prose before or after the JSON object.`
        : params.systemMessage

    const response = await anthropicClient().messages.create({
        model: params.model,
        max_tokens: 4096,
        system: systemPrompt,
        temperature: params.temperature ?? 0.3,
        messages: [{ role: 'user', content: params.userContent }],
    })

    let text = ''
    for (const block of response.content) {
        if (block.type === 'text') {
            text += block.text
        }
    }
    // Defensive: strip ```json ... ``` if model wrapped JSON in fences anyway.
    if (params.jsonMode) {
        text = text.trim()
        if (text.startsWith('```')) {
            text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
        }
    }
    return {
        text,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        model: params.model,
    }
}

export async function transcribeAudio(audio: ArrayBuffer | Uint8Array, fileName: string): Promise<string> {
    const bytes = audio instanceof Uint8Array ? audio : new Uint8Array(audio)
    const file = await toFile(bytes, fileName, {
        type: guessContentType(fileName),
    })
    const result = await openaiClient().audio.transcriptions.create({
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
  "energy": one of: ${ENERGIES.map((e) => `"${e}"`).join(', ')},
  "content_potential": number|null  // 1-10 if it could become a reels/post/video, else null
}

User context (use for category disambiguation and content_potential scoring):
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

Return JSON only. No prose, no markdown fences.`

export async function analyze(transcript: string): Promise<AIAnalysis> {
    const result = await chatCompletion(
        {
            systemMessage: SYSTEM_PROMPT,
            userContent: transcript,
            jsonMode: true,
            temperature: 0.3,
        },
        'analyze',
    )

    const raw = result.text || '{}'
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

function buildContext(
    ctx: { north_stars?: string; about_me?: string; daily_hours?: number },
    resumes?: Resume[],
): string {
    let s = ''
    const northStars = (ctx.north_stars ?? '').trim()
    if (northStars.length > 0) {
        s += `User's north stars for the next 1-2 years:\n${northStars}\n\n`
    }
    s += PLANNING_GUIDANCE
    if (ctx.daily_hours && ctx.daily_hours > 0) {
        s += `\n\nTime the user can realistically dedicate to tasks OUTSIDE the day job: ~${ctx.daily_hours}h/day. This is the AUTHORITATIVE budget — size every task and plan to fit it, overriding any generic assumption.`
    }
    const profileText = (ctx.about_me ?? '').trim().slice(0, 2500)
    if (profileText.length > 0) {
        s += `\n\nAbout the user (free-form profile they wrote — treat as ground truth about their background, skills, current life situation):\n${profileText}`
    }
    s += buildResumesBlock(resumes)
    return s
}

// Generic planning guidance — applies to every user regardless of their goals.
// Personal north stars now live per-user in the profile (see buildContext).
const PLANNING_GUIDANCE = `Time budget (very important — pick task SIZES that fit):
- The user's concrete daily capacity for tasks outside the day job is provided separately below — treat THAT number as authoritative for sizing. Evening slots for someone with family are split and fragile.
- Weekends are more flexible than weekdays (Sunday especially can take a larger chunk; Saturday is often family-heavy but still has some windows).
- Day-of-week awareness: Friday → keep it light, weekend coming. Sunday → can pick something more ambitious. Monday → ramp up, don't overload.
- Never schedule more than 5 tasks for a single day. 3-4 is the sweet spot.`

export async function generateMotivation(
    entry: Entry,
    parent: Entry | null = null,
    profile: UserProfile,
    resumes: Resume[],
): Promise<string> {
    const result = await chatCompletion(
        {
            systemMessage: `You write motivational reasoning for one specific long-term task. Goal: in 3-5 sentences IN RUSSIAN, explain WHY this task matters — connect to north stars, name the concrete reward on a realistic timeline, and end with what's lost by dropping it.

Tone rules:
- Direct and slightly emotional. NO flattery ("ты молодец", "у тебя получится", "ты сможешь").
- Honest about effort and the path, not aspirational fluff.
- Reference SPECIFIC north stars when relevant (career axis, YouTube subs, income, Three.js course).
- Estimate a realistic outcome window ("через 2-3 месяца", "к концу спринта", etc.).
- End with a sentence about the COST of dropping it (lost momentum, opportunity, etc.).

${buildContext(profile, resumes)}

Return plain text. No JSON, no markdown headers, no quotes — just the motivation paragraph.`,
            userContent: JSON.stringify({
                title: entry.title,
                summary: entry.summary,
                transcript: entry.transcript.slice(0, 1500),
                next_action: entry.next_action,
                category: entry.category,
                tags: entry.tags,
                extra_context: entry.extra_context,
                parent: parent
                    ? {
                          title: parent.title,
                          motivation: parent.motivation,
                          extra_context: parent.extra_context,
                      }
                    : null,
            }),
            temperature: 0.6,
        },
        'motivation',
    )
    return result.text.trim()
}

export interface SubtaskSuggestion {
    title: string
    next_action: string | null
}

export type SubtaskResult =
    | { kind: 'subtasks'; subtasks: SubtaskSuggestion[] }
    | { kind: 'needs_context'; question: string }

export async function suggestSubtasks(entry: Entry, profile: UserProfile, resumes: Resume[]): Promise<SubtaskResult> {
    const result = await chatCompletion(
        {
            systemMessage: `You help break down ONE large task. CRITICAL RULE: do not hallucinate structure you don't actually know.

The user may provide source material in the "extra_context" field — course curriculum (ToC), brief, design spec, links, etc. Use that as ground truth.

You have TWO possible responses:

A) If you CAN ground subtasks in real evidence (title is self-explanatory like "ответить на письмо X", OR transcript has enough detail, OR extra_context provides the source material):
{
  "kind": "subtasks",
  "subtasks": [{ "title": "...", "next_action": "..." | null }]
}

B) If the task references an EXTERNAL source you don't have (e.g. "пройти курс Bruno Simon" without curriculum, "сделать дизайн X" without spec, "прочитать книгу Y" without ToC):
{
  "kind": "needs_context",
  "question": "<1-2 sentences in Russian: WHAT specific material to paste into extra_context. Be concrete: 'Вставь оглавление курса (список глав).', not 'опиши подробнее'."
}

Each subtask (when you DO return them) should:
- Take ~30-90 min of focused work
- Have a clear, narrow scope (one chapter, one PR, one section, one shoot)
- Be doable independently
- Be in the SAME language as the parent task (usually Russian)
- Reference ACTUAL evidence from transcript/extra_context, NOT invented names

${buildContext(profile, resumes)}

Return JSON only. No prose, no fences.`,
            userContent: JSON.stringify({
                title: entry.title,
                summary: entry.summary,
                transcript: entry.transcript.slice(0, 2000),
                next_action: entry.next_action,
                category: entry.category,
                tags: entry.tags,
                extra_context: entry.extra_context,
            }),
            jsonMode: true,
            temperature: 0.4,
        },
        'subtasks',
    )
    const raw = result.text || '{}'
    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(`AI subtasks returned non-JSON: ${raw.slice(0, 200)}`)
    }
    const obj = (parsed ?? {}) as Record<string, unknown>

    if (obj.kind === 'needs_context') {
        const q = typeof obj.question === 'string' ? obj.question.trim() : ''
        if (q.length > 0) {
            return { kind: 'needs_context', question: q }
        }
    }

    const rawSubs = Array.isArray(obj.subtasks) ? obj.subtasks : []
    const subs = rawSubs
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
            title: typeof s.title === 'string' ? s.title.slice(0, 120) : '',
            next_action: typeof s.next_action === 'string' && s.next_action.trim().length > 0 ? s.next_action : null,
        }))
        .filter((s) => s.title.length > 0)
        .slice(0, 6)

    return { kind: 'subtasks', subtasks: subs }
}

export interface StrategyResult {
    body: string
    model: string
    system_prompt: string
    user_content: string
}

export async function generateStrategy(context: StrategyContext): Promise<StrategyResult> {
    const systemMessage = `You are a senior career & life strategist consulting one specific person. Your job is to deliver an HONEST, GROUNDED 30-day strategic read.

You are NOT an enthusiastic coach. You are NOT a planner that lists tasks. You are a strategist who:
- Calls out open loops the user is carrying (incomplete commitments, abandoned threads — the "backpack" feeling).
- Identifies the ONE thing to focus on next 30 days. Not three things. ONE. Justify why.
- Names what to ARCHIVE outright (don't leave it lingering in the backlog). Be ruthless. Reducing scope is the gift.
- Suggests a realistic time-of-day strategy based on the user's actual schedule constraints.
- Lists 1-2 micro-wins to close THIS week (small, shippable — defeat the backpack).
- Names ONE honest risk that could derail the plan.

${buildContext(
    { north_stars: context.north_stars, about_me: context.profile_about_me, daily_hours: context.daily_hours },
    context.resumes.map((r) => ({ id: '', label: r.label, content_text: r.content_text, created_at: '' })),
)}

Tone:
- Direct, slightly stern. No flattery, no cheerleader language.
- Treat the user like a peer who asked for honest counsel.
- Reference SPECIFIC facts from the user's recent entries / profile / resumes. Don't write generic advice.
- Write in Russian.

Output: plain text with Markdown headings (## level) for these sections, exactly in this order:

## Где ты сейчас
2-3 sentences summarizing the user's actual state — what's moving, what's stuck. Cite concrete numbers from the context (entries captured, done, sprint state).

## Открытые петли (рюкзак)
2-3 bullets — specific abandoned/lingering commitments. Reference concrete entries by what they are about. Be honest.

## ОДИН фокус на 30 дней
A heading-level pick. Then 2-3 sentences justifying WHY this and not the alternatives. Reference north stars + user's real situation.

## Что в архив СЕЙЧАС
A short bulleted list of things to actively kill from the backlog. 2-4 items. Brief reason each.

## Окно времени
1-2 sentences proposing realistic time-of-day windows given the user's stated capacity (~${context.daily_hours}h/day outside the day job), work hours, family, and energy. Size the focus + micro-wins to fit that budget — don't propose more than fits.

## 1-2 микро-победы на эту неделю
Numbered list. Concrete, shippable in 30-90 min each. Closes loops in the backpack.

## Главный риск
1 sentence — what's most likely to derail the plan, and how to neutralize it.

Return ONLY the markdown — no preamble, no quotes around it.`

    const userContent = JSON.stringify(context, null, 2)

    const result = await chatCompletion(
        {
            systemMessage,
            userContent,
            temperature: 0.7,
        },
        'strategy',
    )

    return { body: result.text.trim(), model: result.model, system_prompt: systemMessage, user_content: userContent }
}

export interface WeekPlanResult {
    body: string
    model: string
    system_prompt: string
    user_content: string
}

export async function generateWeekPlan(context: WeekPlanContext): Promise<WeekPlanResult> {
    const systemMessage = `You turn the user's 30-day strategy into a concrete plan for the CURRENT week (Mon-Sun). You are not a cheerleader and not a generic planner — you pick a SMALL, honest set of tasks that actually fit the user's real daily budget and that move the strategic focus forward.

Ground rules:
- Anchor everything on the user's ONE 30-day focus from the latest strategy (provided below). If no strategy is given, infer the most load-bearing focus from the north stars + open backlog, and say so in one line.
- Pick tasks from the user's REAL open backlog (provided below). Reference actual entries by their title — do NOT invent tasks that aren't grounded in the backlog or the focus. You may add at most ONE small task that isn't in the backlog if the focus clearly needs it.
- 3-5 tasks for the WHOLE week. Not per day. Fewer is better — closing loops beats opening them (the user's core pain is a "backpack" of open commitments).
- Every task must fit the user's daily capacity. Size each one and make the week's total realistic for that budget across the days left.
- Be ruthless about what to NOT do this week — naming what to defer is part of the plan.

${buildContext(
    { north_stars: context.north_stars, about_me: context.profile_about_me, daily_hours: context.daily_hours },
    context.resumes.map((r) => ({ id: '', label: r.label, content_text: r.content_text, created_at: '' })),
)}

Tone:
- Direct, concrete, slightly stern. No flattery.
- Reference SPECIFIC backlog entries and the strategic focus. No generic advice.
- Write in Russian.

Output: plain text with Markdown headings (## level), exactly in this order:

## Фокус недели
1 sentence — restate the ONE focus, scoped to these ${context.week_days_left} days left in the week (${context.week_label}).

## Задачи (3-5)
A numbered list. Each item: **краткое название задачи** — one clause WHY it matters now + estimated time that fits ~${context.daily_hours}h/day. Prefer real backlog entries by their title.

## Распределение по дням
2-4 short bullets proposing which task(s) land on which day, respecting ~${context.daily_hours}h/day, lighter Fridays and the days actually left this week.

## Чего НЕ делать на этой неделе
1-2 bullets — what to consciously defer so the week stays realistic.

Return ONLY the markdown — no preamble, no quotes around it.`

    const userContent = JSON.stringify(context, null, 2)

    const result = await chatCompletion(
        {
            systemMessage,
            userContent,
            temperature: 0.6,
        },
        'week_plan',
    )

    return { body: result.text.trim(), model: result.model, system_prompt: systemMessage, user_content: userContent }
}
