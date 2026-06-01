-- Orbit: multiple resumes per user.
-- Each resume is a parsed text blob with a human label (e.g. "Senior FE for Vercel").
-- All resumes are fed to AI planning prompts as different angles on the user's experience.

create table if not exists public.resumes (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  content_text  text not null,
  created_at    timestamptz not null default now()
);

create index if not exists resumes_created_at_idx
  on public.resumes (created_at desc);

alter table public.resumes disable row level security;
