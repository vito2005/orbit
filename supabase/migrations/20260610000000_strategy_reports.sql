-- Orbit: AI-generated strategic reports.
-- The user opens /strategy and asks for a high-level "where am I, what should
-- I focus on" reasoning. Each generation persists so the user can compare
-- weekly drift over time.

create table if not exists public.strategy_reports (
  id           uuid primary key default gen_random_uuid(),
  model        text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists strategy_reports_created_at_idx
  on public.strategy_reports (created_at desc);

alter table public.strategy_reports disable row level security;
