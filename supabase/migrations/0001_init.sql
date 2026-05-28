-- Orbit initial schema
-- Run this in Supabase SQL editor, or via `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),

  telegram_message_id  text,
  type                 text not null check (type in ('voice', 'text')),
  original_audio_url   text,

  transcript           text not null,
  title                text not null,
  summary              text not null default '',
  category             text not null,
  tags                 text[] not null default '{}',
  next_action          text,
  priority             text not null default 'later'
                       check (priority in ('now', 'this_week', 'later', 'archive')),
  energy               text not null default 'medium'
                       check (energy in ('low', 'medium', 'high')),
  content_potential    int,

  raw_ai_json          jsonb not null default '{}'::jsonb
);

create index if not exists entries_created_at_desc_idx
  on public.entries (created_at desc);

create index if not exists entries_category_idx
  on public.entries (category);

create index if not exists entries_priority_idx
  on public.entries (priority);

create index if not exists entries_tags_gin_idx
  on public.entries using gin (tags);

-- The bot uses the service-role key, so RLS does not block it.
-- The dashboard also reads via service-role (server-side only). Keep RLS off
-- for v1 since no auth is exposed publicly.
alter table public.entries disable row level security;

-- Storage bucket for audio files. Create it manually in the Supabase dashboard
-- (Storage → New bucket → name "orbit-audio", set Public if you want playback
-- in the dashboard), or run:
--   insert into storage.buckets (id, name, public)
--   values ('orbit-audio', 'orbit-audio', true)
--   on conflict (id) do nothing;
