-- Orbit: AI-generated weekly plans.
--
-- The Week tab takes the latest strategy's 30-day focus + the user's daily-hours
-- budget + the real open backlog, and writes 3-5 concrete, time-sized tasks for
-- the current Mon-Sun week. Mirrors strategy_reports: each generation persists
-- (with the exact prompt) so the user can look back and compare week to week.

create table if not exists public.weekly_plans (
  id            uuid primary key default gen_random_uuid(),
  model         text not null,
  body          text not null,
  week_start    date not null,
  system_prompt text not null default '',
  user_content  text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists weekly_plans_created_at_idx
  on public.weekly_plans (created_at desc);

alter table public.weekly_plans disable row level security;
