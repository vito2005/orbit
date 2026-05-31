# 🪐 Orbit

A private, voice-first life inbox. Send a voice message or text to your Telegram
bot, and Orbit transcribes it, categorizes it with an LLM, and saves it into a
single dashboard you can review on your schedule.

Built for one user (you). No multi-tenancy, no auth UI, no embeddings, no
calendar — just capture → structure → review.

## Stack

- **Runtime:** Bun
- **Bot:** Telegraf + Elysia (HTTP for health checks)
- **AI:** OpenAI (`whisper-1` for transcription, `gpt-4o-mini` for analysis)
- **Storage:** Supabase Postgres + Supabase Storage
- **Dashboard:** SvelteKit (Svelte 5) + Node adapter

## Project layout

```
orbit/
├── apps/
│   ├── bot/                # Telegram bot + Elysia health endpoint
│   └── dashboard/          # SvelteKit dashboard (password-protected)
├── packages/
│   └── shared/             # Types, env, OpenAI + Supabase clients
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
├── .env.example
└── README.md
```

## Prerequisites

- [Bun](https://bun.sh/) ≥ 1.1
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- Your Telegram user ID (DM [@userinfobot](https://t.me/userinfobot) to get it)
- An OpenAI API key with access to Whisper and a chat model
- A Supabase project (free tier is fine)

## Setup

```bash
# 1. Install dependencies (uses Bun workspaces)
bun install

# 2. Copy env file and fill in values
cp .env.example .env
# edit .env

# 3. Run the SQL migration in Supabase
#    Open the Supabase dashboard → SQL editor → paste the contents of
#    supabase/migrations/0001_init.sql → run.

# 4. Create a Storage bucket named "orbit-audio" (must match
#    SUPABASE_STORAGE_BUCKET). Make it Public if you want playback in the
#    dashboard. Dashboard → Storage → New bucket.
```

### Environment variables

| Variable                     | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`         | Token from @BotFather                                       |
| `TELEGRAM_ALLOWED_USER_ID`   | Your numeric Telegram user ID — bot ignores everyone else   |
| `OPENAI_API_KEY`             | OpenAI key                                                  |
| `OPENAI_TRANSCRIBE_MODEL`    | Defaults to `whisper-1`                                     |
| `OPENAI_CHAT_MODEL`          | Defaults to `gpt-4o-mini`                                   |
| `SUPABASE_URL`               | `https://<project>.supabase.co`                             |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service role key (server-side only, never expose to client) |
| `SUPABASE_STORAGE_BUCKET`    | Bucket for raw audio (default `orbit-audio`)                |
| `DASHBOARD_PASSWORD`         | Single password to unlock the dashboard                     |
| `WEB_PUSH_VAPID_PUBLIC_KEY`  | Public VAPID key for dashboard Web Push                     |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Private VAPID key for dashboard Web Push                    |
| `WEB_PUSH_VAPID_SUBJECT`     | VAPID subject, usually `mailto:<you>`                       |
| `BOT_PORT`                   | Port for the bot's HTTP health endpoint (default `3001`)    |

## Running locally

The bot and dashboard load `.env` from the repo root, so keep one `.env` file
at the top level.

```bash
# Run the Telegram bot (long-polling, auto-reload)
bun run bot

# In another terminal: run the dashboard
bun run dashboard
# → http://127.0.0.1:5173
```

The dashboard is bound to `127.0.0.1` (localhost only) and gated behind
`DASHBOARD_PASSWORD`. Do not expose it publicly without a real auth layer.

## How it works

1. **Capture.** You send a voice or text DM to your bot. The bot ignores anyone
   whose Telegram user ID does not match `TELEGRAM_ALLOWED_USER_ID`.
2. **Transcribe (voice only).** Audio is downloaded from Telegram, uploaded to
   Supabase Storage, then transcribed with Whisper.
3. **Analyze.** The transcript goes to `gpt-4o-mini` with a strict JSON schema
   prompt that returns title, summary, category, tags, next action, priority,
   energy, and content potential.
4. **Save.** A row is inserted in `public.entries`.
5. **Reply.** The bot replies with the title, category, priority, and next
   action so you can confirm at a glance.

## Bot commands

- `/start` — short help text
- `/today` — entries with priority `now` or `this_week`
- `/week` — AI-generated review of the last 7 days
- `/categories` — list the available categories

## Categories

`work`, `3d`, `content`, `standup`, `family`, `money`, `health`, `personal`,
`random`. See [packages/shared/src/ai.ts](packages/shared/src/ai.ts) for the
classification rules baked into the prompt.

## Production notes

This project is intentionally minimal. If you want to deploy it, the easiest
path is:

- Run the bot as a long-running process (e.g. a small VPS, Fly.io, Railway).
- Build the dashboard with `bun run dashboard:build` and serve `apps/dashboard/build/index.js` behind a reverse proxy that adds TLS + basic auth. The built-in `DASHBOARD_PASSWORD` is good enough for local-only use.

## Roadmap / not in v1

- Daily/weekly automated nudges
- Marking entries as done
- Embeddings + semantic search
- Multi-user / proper auth
- Mobile-optimized dashboard UI
