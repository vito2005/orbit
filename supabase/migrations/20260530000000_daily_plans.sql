-- Orbit: daily plans persistence
-- One row per calendar day. Stores the AI's overall reasoning, the picked
-- entry ids (ordered), and a per-task explanation map.

create table if not exists public.daily_plans (
  date          date primary key,
  reasoning     text not null default '',
  entry_ids     uuid[] not null default '{}',
  explanations  jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.daily_plans disable row level security;
