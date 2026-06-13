import { analyze, type Entry, env, insertEntry, type NewEntry, transcribeAudio, uploadAudio } from '@orbit/shared'

import { log } from './log.ts'

export async function processVoice(args: {
    fileBytes: ArrayBuffer
    telegramFileName: string
    telegramMessageId: number
}): Promise<Entry> {
    log.info(`Uploading audio ${args.telegramFileName} (${args.fileBytes.byteLength} bytes)`)
    const audioUrl = await uploadAudio(args.fileBytes, `${Date.now()}-${args.telegramFileName}`, 'audio/ogg')

    log.info('Transcribing audio')
    const transcript = await transcribeAudio(args.fileBytes, args.telegramFileName)
    log.info(`Transcript (${transcript.length} chars)`)

    log.info('Analyzing transcript')
    const analysis = await analyze(transcript)

    const entry: NewEntry = {
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

    const saved = await insertEntry(entry)
    log.info(`Saved entry ${saved.id} (${saved.category})`)
    return saved
}

export async function processText(args: { text: string; telegramMessageId: number }): Promise<Entry> {
    log.info(`Analyzing text (${args.text.length} chars)`)
    const analysis = await analyze(args.text)

    const entry: NewEntry = {
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

    const saved = await insertEntry(entry)
    log.info(`Saved entry ${saved.id} (${saved.category})`)
    return saved
}

// keep TS happy if env is unused in some bundlers
void env
