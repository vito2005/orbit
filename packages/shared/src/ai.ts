import Anthropic from '@anthropic-ai/sdk'
import OpenAI, { toFile } from 'openai'

import { env } from './env'
import { type AIAnalysis, CATEGORIES, type Category, ENERGIES, type Energy } from './types'

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

// Providers rate-limit legitimately when several captures land at once, and a
// 429 should not surface to the user as a failed note.
async function withRetry<T>(operation: () => Promise<T>, attempts = 4): Promise<T> {
    for (let attempt = 1; ; attempt++) {
        try {
            return await operation()
        } catch (err) {
            const status = (err as { status?: number }).status
            const retryable = status === 429 || (status !== undefined && status >= 500)
            if (!retryable || attempt >= attempts) {
                throw err
            }
            await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)))
        }
    }
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
    return isAnthropicModel(model)
        ? await withRetry(() => callAnthropic({ ...params, model }))
        : await withRetry(() => callOpenAI({ ...params, model }))
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
    const result = await withRetry(() =>
        openaiClient().audio.transcriptions.create({
            file,
            model: env.OPENAI_TRANSCRIBE_MODEL,
        }),
    )
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
  "tags": string[],            // 2-6 short lowercase tags, in the SAME language as input
  "next_action": string|null,  // only a step the user actually stated or clearly implied, else null
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

Output rules:
- Every string you produce — title, summary AND tags — must be in the SAME language as the transcript. Never translate to English. A Russian transcript gets Russian tags.
- next_action must be grounded in what the user actually said. If they stated no next step, return null. Never invent follow-up work, backups, or cleanup the user did not mention.

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
