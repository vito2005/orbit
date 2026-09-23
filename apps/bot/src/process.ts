import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import {
    analyze,
    type Entry,
    getProfileFor,
    getServiceClient,
    insertEntry,
    insertTranslation,
    type NewEntry,
    transcribeAudio,
    translateClip,
    type Translation,
    translationUsageSince,
    uploadAudio,
} from '@orbit/shared'

import { downloadClip, extractAudio, extractCover, extractFrameGrids } from './clip.ts'
import { log } from './log.ts'

export async function processVoice(args: {
    userId: string
    fileBytes: ArrayBuffer
    telegramFileName: string
    telegramMessageId: number
}): Promise<Entry> {
    const supabase = getServiceClient()

    log.info(`Uploading audio ${args.telegramFileName} (${args.fileBytes.byteLength} bytes)`)
    const audioUrl = await uploadAudio(
        supabase,
        args.userId,
        args.fileBytes,
        `${Date.now()}-${args.telegramFileName}`,
        'audio/ogg',
    )

    log.info('Transcribing audio')
    const transcript = await transcribeAudio(args.fileBytes, args.telegramFileName)
    log.info(`Transcript (${transcript.length} chars)`)

    log.info('Analyzing transcript')
    const profile = await getProfileFor(supabase, args.userId)
    const analysis = await analyze(transcript, profile.categories)

    const entry: NewEntry = {
        user_id: args.userId,
        telegram_message_id: String(args.telegramMessageId),
        type: 'voice',
        original_audio_url: audioUrl,
        transcript,
        title: analysis.title,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        next_action: analysis.next_action,
        priority: 'backlog',
        energy: analysis.energy,
        content_potential: analysis.content_potential,
        raw_ai_json: analysis,
        parent_id: null,
    }

    const saved = await insertEntry(supabase, entry)
    log.info(`Saved entry ${saved.id} (${saved.category})`)
    return saved
}

export async function processText(args: { userId: string; text: string; telegramMessageId: number }): Promise<Entry> {
    const supabase = getServiceClient()

    log.info(`Analyzing text (${args.text.length} chars)`)
    const profile = await getProfileFor(supabase, args.userId)
    const analysis = await analyze(args.text, profile.categories)

    const entry: NewEntry = {
        user_id: args.userId,
        telegram_message_id: String(args.telegramMessageId),
        type: 'text',
        original_audio_url: null,
        transcript: args.text,
        title: analysis.title,
        summary: analysis.summary,
        category: analysis.category,
        tags: analysis.tags,
        next_action: analysis.next_action,
        priority: 'backlog',
        energy: analysis.energy,
        content_potential: analysis.content_potential,
        raw_ai_json: analysis,
        parent_id: null,
    }

    const saved = await insertEntry(supabase, entry)
    log.info(`Saved entry ${saved.id} (${saved.category})`)
    return saved
}

// Each clip bills Whisper by the minute and a vision model by the frame —
// about three cents for two minutes. The caps keep a runaway day at ~15 cents.
export const CLIP_DAILY_COUNT = 5
export const CLIP_DAILY_SECONDS = 600
const DAY_MS = 24 * 60 * 60 * 1000

export type ClipOutcome =
    | { kind: 'saved'; translation: Translation; cover: Uint8Array }
    | { kind: 'not-english' }
    | { kind: 'nothing-to-translate' }
    | { kind: 'count-limit' }
    | { kind: 'too-long'; remainingSeconds: number }

export async function processClip(args: {
    userId: string
    url: string
    telegramMessageId: number
}): Promise<ClipOutcome> {
    const supabase = getServiceClient()

    const usage = await translationUsageSince(supabase, args.userId, new Date(Date.now() - DAY_MS))
    if (usage.count >= CLIP_DAILY_COUNT) {
        return { kind: 'count-limit' }
    }
    const remainingSeconds = CLIP_DAILY_SECONDS - usage.seconds
    if (remainingSeconds <= 0) {
        return { kind: 'too-long', remainingSeconds: 0 }
    }

    const dir = await mkdtemp(`${tmpdir()}/orbit-clip-`)
    try {
        log.info(`Downloading clip ${args.url}`)
        const clip = await downloadClip(args.url, dir, remainingSeconds)
        if (!clip) {
            return { kind: 'too-long', remainingSeconds }
        }

        const [audio, frames, cover] = await Promise.all([
            extractAudio(clip.path, dir),
            extractFrameGrids(clip.path, dir),
            extractCover(clip.path, dir, clip.durationSeconds),
        ])
        const transcript = audio ? await transcribeAudio(audio, 'audio.mp3') : ''
        log.info(`Clip ${clip.durationSeconds}s: transcript ${transcript.length} chars, ${frames.length} frame grids`)

        const result = await translateClip(transcript, frames)
        if (result.status !== 'translated') {
            return { kind: result.status }
        }

        const saved = await insertTranslation(supabase, {
            ...result.translation,
            user_id: args.userId,
            telegram_message_id: String(args.telegramMessageId),
            source_url: args.url,
            duration_seconds: clip.durationSeconds,
        })
        log.info(`Saved translation ${saved.id}`)
        return { kind: 'saved', translation: saved, cover }
    } finally {
        await rm(dir, { recursive: true, force: true })
    }
}
