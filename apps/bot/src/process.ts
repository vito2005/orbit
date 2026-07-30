import {
    analyze,
    type Entry,
    getServiceClient,
    insertEntry,
    type NewEntry,
    transcribeAudio,
    uploadAudio,
} from '@orbit/shared'

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
    const analysis = await analyze(transcript)

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
    const analysis = await analyze(args.text)

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
