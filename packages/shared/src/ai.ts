import Anthropic from '@anthropic-ai/sdk'
import OpenAI, { toFile } from 'openai'

import { env } from './env'
import { type AIAnalysis, DEFAULT_CATEGORIES, ENERGIES, type Energy } from './types'

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

// Built per request: the valid categories are whatever the owner configured, so
// the prompt cannot name them ahead of time. The old version also carried
// classification rules written around one person's life (Three.js, YouTube,
// standup) — with a user-defined list those rules would be actively wrong, so
// the names themselves have to carry the meaning.
function buildSystemPrompt(categories: string[]): string {
    return `You are a personal life-inbox assistant. The user sends raw thoughts in any language (often Russian). You must analyze the transcript and return STRICT JSON with this exact shape:

{
  "title": string,             // <= 80 chars, in the SAME language as input
  "summary": string,           // 1-3 sentences in the SAME language as input
  "category": one of: ${categories.map((c) => `"${c}"`).join(', ')},
  "tags": string[],            // 2-6 short lowercase tags, in the SAME language as input
  "next_action": string|null,  // only a step the user actually stated or clearly implied, else null
  "energy": one of: ${ENERGIES.map((e) => `"${e}"`).join(', ')},
  "content_potential": number|null  // 1-10 if it could become a post or video, else null
}

Categorisation:
- Read the category names as the user's own vocabulary and pick the one that fits best.
- Pick exactly one. If nothing fits well, choose the most general category available.
- Never invent a category outside the list.

Output rules:
- Every string you produce — title, summary AND tags — must be in the SAME language as the transcript. Never translate to English. A Russian transcript gets Russian tags.
- next_action must be grounded in what the user actually said. If they stated no next step, return null. Never invent follow-up work, backups, or cleanup the user did not mention.

Return JSON only. No prose, no markdown fences.`
}

export async function analyze(transcript: string, categories?: string[]): Promise<AIAnalysis> {
    const allowed = categories?.length ? categories : [...DEFAULT_CATEGORIES]
    const result = await chatCompletion(
        {
            systemMessage: buildSystemPrompt(allowed),
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
    return normalizeAnalysis(parsed, transcript, allowed)
}

function normalizeAnalysis(input: unknown, transcript: string, categories: string[]): AIAnalysis {
    const obj = (input ?? {}) as Record<string, unknown>

    // Falls back to the last configured category, which the prompt describes as
    // the catch-all — a hardcoded 'random' may not exist in this user's list.
    const category = categories.includes(obj.category as string)
        ? (obj.category as string)
        : (categories.at(-1) ?? 'random')

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
