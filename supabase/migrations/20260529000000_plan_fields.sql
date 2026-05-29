-- Orbit: add planning fields to entries
-- Run this in Supabase SQL editor after 0001_init.sql.

alter table public.entries
  add column if not exists scheduled_for date,
  add column if not exists done_at       timestamptz;

create index if not exists entries_scheduled_for_idx
  on public.entries (scheduled_for);

create index if not exists entries_done_at_idx
  on public.entries (done_at);
