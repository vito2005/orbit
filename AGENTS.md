# Orbit — conventions for AI agents

These conventions apply to every file in this repo. They are guidelines —
deviate only with a clear reason and call it out.

The stack:

- **Runtime:** Bun (no Node, no npm scripts via `node`).
- **Bot:** Telegraf 4 + Elysia (HTTP for health).
- **Dashboard:** SvelteKit 2 + Svelte 5 (runes mode) + adapter-node.
- **Data:** Supabase Postgres + Supabase Storage.
- **AI:** OpenAI SDK v6+ (Whisper for transcription, chat completions for analysis).

## Project layout

```
apps/
  bot/        # Telegraf bot + Elysia health endpoint (long-polling)
  dashboard/  # SvelteKit, password-gated, server-side data fetching only
packages/
  shared/     # Types, env, Supabase + OpenAI clients — used by both apps
supabase/
  migrations/ # Plain SQL — run in Supabase SQL editor
```

The shared package is a workspace dep (`workspace:*`). Import as
`import { ... } from "@orbit/shared"` from any app. **Do not** put app-specific
logic in `packages/shared` — only things consumed by both bot and dashboard.

## Architecture: simple & functional

This is a single-user MVP. Keep it that way:

- **No DI containers, no service locators, no class hierarchies.** Plain
  functions and modules.
- **No DDD layers** (`domain/`, `application/`, `infrastructure/`). The data
  flow is short: input → transcribe → analyze → store → render. If you feel
  the urge to abstract behind interfaces, ask first.
- **No premature config files / feature flags.** Add an env var only when
  there is a real reason to vary it between environments.
- **No "I'll add this later" stubs.** Either implement or leave it out.

When a function in `packages/shared` grows behavior, split _by capability_
(e.g. `ai.ts`, `supabase.ts`), not by architectural layer.

## Bun, not Node

- Use Bun for everything: `bun install`, `bun run <script>`, `bunx <bin>`.
  Never run `npm`, `npx`, `yarn`, or `pnpm` in this repo.
- Use Bun's built-ins where they exist: `Bun.file`, `Bun.serve`, `fetch`,
  `crypto.subtle`. Avoid `node:fs` / `node:path` unless an external lib
  requires it.
- The bot runs via `bun --watch apps/bot/src/index.ts`. The dashboard runs via
  Vite (`bun --cwd apps/dashboard run dev`).

## TypeScript

- **No `any`.** When a value is genuinely unknown, use `unknown` and narrow.
  Type API responses, page data, and OpenAI/Supabase results explicitly.
- All shared types live in [packages/shared/src/types.ts](packages/shared/src/types.ts).
  Reuse `Category`, `Priority`, `Energy`, `Entry`, `AIAnalysis`. Don't duplicate.
- Import paths in `packages/shared/src/*.ts` use **no extension** (e.g.
  `from "./types"`), so both Bun and Vite/SvelteKit can resolve them.
- Strict mode is on. If TS complains, fix the types — don't `@ts-ignore`.

## Code style (formatting & lint)

Enforced by Prettier + ESLint — run `bun run format` before committing.

- **No semicolons.** Prettier is configured with `semi: false`. Don't add `;`
  at the end of TypeScript / JavaScript / Svelte statements.
- **Single quotes** for strings (`'foo'`, not `"foo"`). JSX/Svelte attributes
  still use double quotes — Prettier handles that automatically.
- **4-space indent**, 120-char print width, trailing commas everywhere ES5
  allows them.
- **Import order** is enforced by `simple-import-sort` (external first, then
  internal, alphabetical). Don't hand-sort — `bun run lint:fix` will do it.
- **Each-block keys** are required in Svelte (`{#each items as item (item.id)}`).
  Lint will flag missing keys.
- **`package.json` is alphabetized** by `sort-package-json`. Run
  `bun run sort-package` after adding a dep.

Commands:

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `bun run format`       | Prettier write — fixes formatting in place     |
| `bun run format:check` | Prettier check — CI-style, exits non-zero      |
| `bun run lint`         | ESLint — reports issues                        |
| `bun run lint:fix`     | ESLint with `--fix` — sorts imports, etc.      |
| `bun run sort-package` | Alphabetize every `package.json` in the repo   |
| `bun run typecheck`    | tsc + svelte-check on both apps                |
| `bun run check`        | Full pipeline: format:check → lint → typecheck |

## Svelte 5 (runes mode)

This project uses Svelte 5. Use **runes**, not the Svelte 3/4 syntax.

### Component state and props

```svelte
<!-- ✓ Svelte 5 runes -->
<script lang="ts">
  let { data }: { data: PageData } = $props();
  let count = $state(0);
  let doubled = $derived(count * 2);
  $effect(() => {
    console.log("count is", count);
  });
</script>

<!-- ✗ Svelte 3/4 — do not use -->
<script lang="ts">
  export let data: PageData;
  let count = 0;
  $: doubled = count * 2;
</script>
```

### Reactivity from props

When deriving from a prop, **always** use `$derived` — a bare `const` only
captures the initial value:

```svelte
<!-- ✗ stale after navigation -->
<script lang="ts">
  let { data } = $props();
  const entry = data.entry;
</script>

<!-- ✓ updates when data changes -->
<script lang="ts">
  let { data } = $props();
  let entry = $derived(data.entry);
</script>
```

### Events

Svelte 5 uses standard HTML event attributes, not `on:event`:

```svelte
<!-- ✓ -->
<button onclick={() => count++}>+</button>

<!-- ✗ Svelte 3/4 -->
<button on:click={() => count++}>+</button>
```

### Snippets, not slots

Use `{@render children()}` and `{#snippet ...}`, not `<slot />`. Children come
through `$props()`:

```svelte
<script lang="ts">
  let { children } = $props()
</script>

<main>{@render children()}</main>
```

## SvelteKit

### Data loading

- Fetch data in `+page.server.ts` (or `+layout.server.ts`) `load` functions —
  not in `onMount` and not from the client. The dashboard reads Supabase with
  the service role key, which **must never** reach the browser.
- Use `+server.ts` only for true API endpoints (e.g. `/api/health`). Avoid
  hand-rolling fetches from `+page.svelte` to `+server.ts` when a server
  `load` would do.

### Auth and cookies

- The dashboard is gated behind `DASHBOARD_PASSWORD` via a session cookie set
  in `src/routes/login/+page.server.ts` and verified in
  [apps/dashboard/src/hooks.server.ts](apps/dashboard/src/hooks.server.ts).
- Use the `Cookies` type from `@sveltejs/kit` for cookie helpers — don't
  invent a structural type.
- **`+layout@.svelte` does NOT skip the root layout.** It only skips
  intermediate layouts. To hide chrome (topbar, north stars) on a specific
  route like `/login`, render it conditionally in the root layout based on
  `page.url.pathname` from `$app/state`. See
  [+layout.svelte](apps/dashboard/src/routes/+layout.svelte).

### Routing

- Dynamic params: `[id]` folders, accessed via `params.id` in `+page.server.ts`.
- Use `throw error(404, "…")` and `throw redirect(303, "…")` from
  `@sveltejs/kit` — don't return them.

### Components

- Split a `.svelte` file when it grows past ~200 lines or has unrelated
  concerns. For a large component, isolate functionality and move it out
  into:
  - a **child component** in `$lib/components/` — a self-contained UI chunk
    or repeated markup (see [EntryEdit](apps/dashboard/src/lib/components/EntryEdit.svelte));
  - a **state helper** (`$lib/<feature>.svelte.ts` or `$lib/<feature>.ts`) —
    reactive logic with `$state`/`$derived`, or plain stateful functions;
  - a **utility** in `$lib/` — pure functions (e.g.
    [format.ts](apps/dashboard/src/lib/format.ts)).
- Helpers always go under `apps/dashboard/src/lib/` and import via the
  `$lib/...` alias — never `../../something`.
- Several unrelated top-level blocks in one `.svelte` file is also a signal
  to split, even before the 200-line threshold.

### Styling: Tailwind v4 + mobile-first

The dashboard uses **Tailwind v4**, wired through `@tailwindcss/vite`. The
single stylesheet is [apps/dashboard/src/app.css](apps/dashboard/src/app.css),
imported once in `+layout.svelte`.

- **Design tokens are the source of truth.** Colors (`--color-surface`,
  `--color-accent`, `--color-muted`, …), fonts, radii (`rounded-field/box/card`)
  and shadows (`shadow-soft/card`) live in the `@theme` block. Use the generated
  utilities (`bg-surface`, `text-muted`, `rounded-card`, `font-serif`) — never
  raw hex in markup.
- **Dark mode is a token swap, not `dark:` variants.** `[data-theme="dark"]`
  re-defines the same CSS variables in `@layer base`, so every `bg-surface` /
  `text-muted` re-themes automatically. Don't sprinkle `dark:` utilities — add a
  dark token override instead. The theme is set before first paint by an inline
  script in `app.html` and toggled by
  [ThemeToggle.svelte](apps/dashboard/src/lib/components/ThemeToggle.svelte)
  (persisted to `localStorage`, defaulting to `prefers-color-scheme`).
- **Breakpoints are remapped:** `sm` = 600px, `md` = 820px — the only two the
  app uses. The Tailwind defaults are not used.
- **Mobile-first.** Write base utilities for mobile, then layer desktop with
  `sm:` / `md:` prefixes. No `max-width` overrides.
- **Repeated component recipes live in [$lib/ui.ts](apps/dashboard/src/lib/ui.ts)**
  as exported utility-string constants (`btnPrimary`, `card`, `chip`,
  `calloutError`, …). Reuse those instead of re-typing the full string or
  reintroducing a semantic CSS class. One-off layout stays inline.
- **What stays in CSS (not utilities):** base element styling for
  `input` / `select` / `textarea` / `a` (`@layer base`), and AI-generated
  markdown (`.strategy-prose`) whose elements are injected via `{@html}` and
  can't carry classes. Keep these minimal — everything else is utilities.

## Elysia (bot HTTP)

The bot's Elysia server is intentionally minimal — health endpoint only. If
you add routes:

```ts
new Elysia()
  .get('/health', () => ({ ok: true }))
  .post('/webhook', async ({ body }) => {
    // validate, then hand off to a function in `process.ts`
  })
  .listen(env.BOT_PORT)
```

- Keep route handlers thin: parse → call a function in `process.ts` or
  `@orbit/shared` → return JSON.
- Don't import Telegraf into route handlers; route handlers should be safe to
  unit-test without booting the bot.
- The bot uses long-polling (`bot.launch()`). Switch to a Telegram webhook
  only if you also add request-signature validation — never expose the bot
  endpoint unauthenticated.

## Telegraf bot

- The `bot.use(...)` middleware in [apps/bot/src/bot.ts](apps/bot/src/bot.ts)
  silently drops any user other than `TELEGRAM_ALLOWED_USER_ID`. Preserve
  that guard — it is the only access control.
- Reply formatting uses Telegram MarkdownV1. Escape `*`, `_`, `` ` ``, `[` in
  any user-derived text via the helper in
  [apps/bot/src/format.ts](apps/bot/src/format.ts). Don't `parse_mode: "MarkdownV2"` —
  it requires escaping a much larger character set and our content is
  user-language.
- All bot handlers must `try/catch` and reply with a short user-facing error
  on failure, then `log.error(...)` the full stack. Never let an unhandled
  error kill the process.

## OpenAI

- The transcription model defaults to `whisper-1`; the chat model defaults to
  `gpt-4o-mini`. Override via env (`OPENAI_TRANSCRIBE_MODEL`,
  `OPENAI_CHAT_MODEL`) if you need to.
- For audio uploads, use `toFile(bytes, fileName, { type })` from `openai`,
  not the global `File` constructor — the SDK has its own `FileLike` type.
- The classification call uses `response_format: { type: "json_object" }`.
  When extending the prompt, always re-test that the model still returns
  valid JSON — and keep the defensive `normalizeAnalysis` in
  [packages/shared/src/ai.ts](packages/shared/src/ai.ts) as the source of truth
  for fallbacks.

## Supabase

- Server only. The service-role key never touches the browser.
- Schema changes go through a new SQL file in
  [supabase/migrations/](supabase/migrations/) — never `ALTER TABLE` from
  application code.
- RLS is off in v1 (single user, service-role only). If you ever expose the
  Supabase URL+anon key client-side, you must enable RLS _and_ add policies
  in the same change.
- Storage paths are `YYYY-MM-DD/<filename>` — keep that prefix so files are
  browsable by day in the Supabase dashboard.

## Environment variables

- All env reads go through [packages/shared/src/env.ts](packages/shared/src/env.ts).
  Don't read `process.env.X` directly anywhere else.
- Every new env var must be added to both `.env.example` and the table in
  the README in the same change.
- Never log the value of an env var. `log.info("KEY = …")` is a leak.

### One `.env` at the repo root — wired into both apps

There is a **single** `.env` file at the repo root. Both the bot and the
dashboard must see it. Two pieces make that work — keep both:

1. **`apps/dashboard/.env` is a symlink to `../../.env`.** Bun auto-loads
   `.env` only from CWD and does **not** walk up the tree. The dashboard
   runs with CWD `apps/dashboard`, so the symlink is what lets it see the
   root file. Don't replace it with a copy.
2. **Dashboard Vite scripts use `bun --bun vite ...`.** The `vite` binary
   has a `#!/usr/bin/env node` shebang, so without `--bun` it runs under
   Node and Node never auto-loads `.env`. `bun --bun` forces the Bun
   runtime, which does. Don't drop `--bun` from
   [apps/dashboard/package.json](apps/dashboard/package.json) scripts.

The bot has neither problem — `bun --watch apps/bot/src/index.ts` runs
under Bun from the repo root, so `.env` loads automatically.

## Logging and errors

- Bot logs go through [apps/bot/src/log.ts](apps/bot/src/log.ts). It already
  timestamps and prefixes — don't `console.log` in handlers.
- Throw `new Error("…clear message…")` — don't throw strings or objects.
- At system boundaries (Telegram, OpenAI, Supabase), wrap calls in `try/catch`
  and produce a domain-meaningful error message. Inside our own code, trust
  inputs.

## Comments

- Default to no comments. Add one only when the _why_ is non-obvious — a
  workaround, a hidden invariant, a non-default trade-off.
- Don't write "what" comments — names already do that.
- Don't reference tasks or PRs in comments. That belongs in the commit
  message.

## Naming

A name should make clear what the thing is on its own.

- **`handle*` is reserved for event handlers** — functions bound to a DOM or
  Svelte event. Do not give a plain callable function a `handle*` name.
  `onclick={handleSubmit}` is correct; `function handleQuery() {…}` for a
  non-event helper is not.
- Plain functions get verb names describing what they do: `processVoice`,
  `buildSearchQuery`, `formatPrice`, `restoreQuerySnapshot`.
- Keep one convention per file — don't mix `onPriceInput` and `handleReset`
  for the same kind of thing.
- Avoid single-letter / opaque names (`v`, `q`, `e`) outside tiny local
  scopes like `arr.map((e) => …)`.

## Control flow

- Always use braces `{}` for `if` / `else` / `for` / `while` bodies, **even
  single-line ones**. Prettier won't enforce this — discipline does.

```ts
// ✗
if (!user) return null
for (const id of ids) await scheduleFor(id, today)

// ✓
if (!user) {
  return null
}
for (const id of ids) {
  await scheduleFor(id, today)
}
```

Exception: ternary expressions and arrow bodies that are intentionally tiny
(`arr.map((x) => x.id)`) are fine — the rule is for statement bodies.

## Adding a feature: the checklist

1. Does it require a new env var? Add to `env.ts` + `.env.example` + README.
2. Does it touch the schema? Add a new SQL file in `supabase/migrations/`.
3. Does it call OpenAI? Extend [packages/shared/src/ai.ts](packages/shared/src/ai.ts),
   not the bot directly.
4. Does it add a new entry source? It should still produce an `Entry` via
   `insertEntry` — keep the pipeline shape consistent.
5. Did you run `bun run check`? That covers format, lint, and typecheck for
   both apps — all of it must pass before you finish.

## When you write Svelte code — use the Svelte MCP

Svelte ships an MCP server at <https://mcp.svelte.dev/mcp> (or via `npx sv add
mcp` locally). When you generate Svelte / SvelteKit code, use these tools to
stay current with Svelte 5:

- `list-sections` — use this **first** to discover available documentation
  sections.
- `get-documentation` — fetch the full doc for the sections that look
  relevant.
- `svelte-autofixer` — run this on Svelte code you just wrote, **before**
  showing it to the user. Iterate on any reported issues.
- `playground-link` — only after the user confirms they want a runnable link.

If the MCP server isn't connected, fall back to the rules in this file — they
cover the Svelte 5 patterns we actually use.
