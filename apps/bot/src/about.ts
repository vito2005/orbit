import type { InlineKeyboardMarkup } from 'telegraf/types'

import { CLIP_LIMITS } from './process.ts'

// Everything the bot says about itself lives here — /help, the welcome, the
// Telegram profile and the command menu — so a new feature is described in one
// place instead of drifting out of date in four.

export const HELP = [
    '🪐 Orbit — твой личный журнал мыслей.',
    '',
    '🎤 Голосовое или текст — расшифрую, дам заголовок, категорию и теги и сохраню в журнал.',
    '',
    '🎬 Ссылка на рилз из Инстаграма или YouTube Shorts на английском — переведу на русский и объясню сленг, ' +
        `шутки и отсылки. Сейчас до ${CLIP_LIMITS.count} роликов и ${CLIP_LIMITS.seconds / 60} минут в сутки, ` +
        'функция в бета-режиме.',
    '',
    '📓 /dashboard — открыть журнал: записи, архив, переводы.',
    '',
    'Что-то не работает — пиши @alexbuki',
].join('\n')

// Said once, right after the account appears — the person has not asked for a
// tour, so it stays to what they need next: send something, and how to get back in.
export const WELCOME = [
    '👋 Аккаунт создан — можно диктовать.',
    '',
    'Присылай голосовое, текст или ссылку на английский рилз — сохраню мысль или переведу видео.',
    '',
    '/dashboard — открыть журнал, вход прямо здесь.',
    'В профиле можно привязать почту и заходить ещё и по ней.',
].join('\n')

export const START_HINT = 'Присылай голос, текст или ссылку на английский рилз — сохраню в журнал или переведу.'

export const LINKED = '✅ Аккаунт привязан. Присылай голос, текст или ссылку на английский рилз.'

// Shown in the empty chat before the person presses Start (512 chars max).
export const PROFILE_DESCRIPTION =
    'Личный журнал мыслей. Присылай голосовое или текст — расшифрую, разберу и сохраню. ' +
    'Кидай ссылку на английский рилз — переведу и объясню шутки.'

// Shown on the bot's profile and when it is shared (120 chars max).
export const PROFILE_SHORT_DESCRIPTION = 'Голосовой журнал мыслей и переводчик рилзов'

export const COMMANDS = [
    { command: 'help', description: 'Что я умею' },
    { command: 'dashboard', description: 'Открыть журнал' },
]

export const HELP_ACTION = 'help'

// A newcomer won't think to open the command menu; one tap under the greeting.
export const helpButton: { reply_markup: InlineKeyboardMarkup } = {
    reply_markup: { inline_keyboard: [[{ text: '❓ Что я умею', callback_data: HELP_ACTION }]] },
}
