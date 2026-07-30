# CLAUDE.md — Orbit

Coding conventions for this repo are kept in `AGENTS.md` so the same rules
apply across AI tools. They are imported below:

@AGENTS.md

## Build & run

```bash
bun install              # install all workspace deps
bun run bot              # start the Telegram bot (long-polling, --watch)
bun run dashboard        # start the SvelteKit dashboard on 127.0.0.1:5173
bun run format           # Prettier write (no semi, single quotes, 4-space)
bun run lint             # ESLint
bun run typecheck        # tsc + svelte-check on both apps
bun run check            # format:check + lint + typecheck — run this before finishing
```

The bot and the dashboard both read the **same `.env`** file at the repo root.
Don't duplicate env files per app.

## Architecture in one paragraph

A Telegram user linked to a Supabase Auth account (see the profile page's
Connect Telegram flow) sends voice or text to the bot. Voice is downloaded from
Telegram, uploaded to Supabase Storage, then transcribed by Whisper. The
transcript (voice) or message text (text) is sent to a chat model with a strict
JSON-schema prompt that returns title, summary, category, tags, next action,
priority, energy, and content potential. The bot inserts an `entries` row scoped
to that user, replies with a saved-confirmation, and the SvelteKit dashboard —
gated by Supabase Auth, isolated per user via RLS — reads the same table for
browsing and filtering.

The pipeline is intentionally one direction: **capture → analyze → store →
display**. There is no edit/update flow yet, and no client-side data fetching.

## Where things live

| Concern                      | File                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Shared types (`Entry`, etc.) | [packages/shared/src/types.ts](packages/shared/src/types.ts)                           |
| Env loader                   | [packages/shared/src/env.ts](packages/shared/src/env.ts)                               |
| Supabase client + queries    | [packages/shared/src/supabase.ts](packages/shared/src/supabase.ts)                     |
| OpenAI transcription + LLM   | [packages/shared/src/ai.ts](packages/shared/src/ai.ts)                                 |
| Telegram handlers            | [apps/bot/src/bot.ts](apps/bot/src/bot.ts)                                             |
| Pipeline (voice/text)        | [apps/bot/src/process.ts](apps/bot/src/process.ts)                                     |
| Bot entry + Elysia health    | [apps/bot/src/index.ts](apps/bot/src/index.ts)                                         |
| Dashboard list page          | [apps/dashboard/src/routes/+page.server.ts](apps/dashboard/src/routes/+page.server.ts) |
| Dashboard auth gate          | [apps/dashboard/src/hooks.server.ts](apps/dashboard/src/hooks.server.ts)               |
| SQL schema                   | [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)                 |

## Don't

- Don't introduce DDD-style folders (`domain/`, `application/`,
  `infrastructure/`). This MVP doesn't need them — see `AGENTS.md` for why.
- Don't add a client-side fetch from Svelte to Supabase. Service-role key is
  server-only.
- Don't add a state-management library (Pinia, Zustand, Svelte stores beyond
  what comes built-in). Use `$state` / `$derived` and server `load`.
- Don't add tests for the LLM prompt — instead, make `normalizeAnalysis` in
  `packages/shared/src/ai.ts` robust enough that malformed JSON degrades
  gracefully.

## When extending

Read `AGENTS.md` first. The "Adding a feature: the checklist" section at the
bottom is the bar to clear before you're done.
