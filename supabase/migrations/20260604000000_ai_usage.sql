-- Orbit: track AI usage per call.
-- Each chat completion logs a row so the user can see how much they've spent
-- in the dashboard. Whisper transcription is NOT tracked here (separate pricing model).

create table if not exists public.ai_usage (
  id                 uuid primary key default gen_random_uuid(),
  model              text not null,
  function_name      text not null,
  prompt_tokens      int not null default 0,
  completion_tokens  int not null default 0,
  cost_usd           numeric(12, 6) not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists ai_usage_created_at_idx on public.ai_usage (created_at desc);
create index if not exists ai_usage_function_name_idx on public.ai_usage (function_name);

alter table public.ai_usage disable row level security;
