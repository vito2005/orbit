-- Orbit: single-row user profile.
-- Stores a free-form "about me" text used by the AI planning prompts to
-- ground tasks in WHO the user actually is (skills, background, current
-- situation). For now it's a plain text field; the user can paste a resume
-- or dictate via OS-level dictation.

create table if not exists public.user_profile (
  id          boolean primary key default true,
  about_me    text not null default '',
  updated_at  timestamptz not null default now(),
  constraint single_row check (id = true)
);

insert into public.user_profile (id) values (true) on conflict (id) do nothing;

alter table public.user_profile disable row level security;
