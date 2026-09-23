-- Translated clips (Instagram reels, YouTube Shorts) live apart from entries:
-- they are something the user watched, not a thought of theirs, so they carry
-- no category, priority or next step.
create table if not exists public.translations (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at           timestamptz not null default now(),

  telegram_message_id  text,
  source_url           text not null,
  -- Kept so the bot can enforce the per-user daily minutes limit.
  duration_seconds     int not null,

  title                text not null,
  summary              text not null default '',
  transcript           text not null,
  translation          text not null,
  notes                jsonb not null default '[]'::jsonb
);

create index if not exists translations_user_created_idx
  on public.translations (user_id, created_at desc);

alter table public.translations enable row level security;

create policy own_rows on public.translations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
