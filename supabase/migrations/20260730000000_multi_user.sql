-- Orbit: single-user -> multi-user.
--
-- Adds a `user_id` owner to every data table, moves user_profile off its
-- boolean singleton, and turns on RLS so Postgres itself isolates each user's
-- rows (`user_id = auth.uid()`). The dashboard queries as the logged-in user
-- (anon key + session) so RLS applies; the bot runs under the service-role key,
-- which bypasses RLS and sets user_id explicitly.
--
-- PREREQUISITE: create the owner account in Supabase Auth (Authentication ->
-- Users) BEFORE running this. Existing rows are backfilled to the first auth
-- user. The guard below fails loudly if no auth user exists yet.

do $$
begin
  if not exists (select 1 from auth.users) then
    raise exception 'Create the owner account in Supabase Auth before running this migration.';
  end if;
end $$;

-- Owner uuid = the first (currently only) auth user.
-- entries / resumes / strategy_reports / weekly_plans: add owner, backfill, lock.
alter table public.entries          add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.resumes          add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.strategy_reports add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.weekly_plans     add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

update public.entries          set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.resumes          set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.strategy_reports set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;
update public.weekly_plans     set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

alter table public.entries          alter column user_id set not null;
alter table public.resumes          alter column user_id set not null;
alter table public.strategy_reports alter column user_id set not null;
alter table public.weekly_plans     alter column user_id set not null;

create index if not exists entries_user_id_idx          on public.entries (user_id);
create index if not exists resumes_user_id_idx          on public.resumes (user_id);
create index if not exists strategy_reports_user_id_idx on public.strategy_reports (user_id);
create index if not exists weekly_plans_user_id_idx     on public.weekly_plans (user_id);

-- user_profile: boolean singleton (id = true) -> one row per user, keyed by user_id.
alter table public.user_profile add column if not exists user_id     uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.user_profile add column if not exists north_stars text not null default '';

update public.user_profile set user_id = (select id from auth.users order by created_at limit 1) where user_id is null;

-- Seed the owner's personal north stars (previously hardcoded in ai.ts). Other
-- users start empty and fill their own on the profile page.
update public.user_profile set north_stars =
'- Career axis: high-paid frontend / creative engineering / 3D engineer (international market)
- Income: from $3k/month → $7.5k/month (~$90k/year)
- YouTube subscribers: from 200 → 5000 (primary content channel; long-form videos about Three.js / frontend)
- Three.js course (Bruno Simon) to be completed — directly serves the 3D career axis
- Secondary content channels: Twitter (as YouTube distributor), LinkedIn (recruiter outreach), Telegram (RU audience)
- Constraint: work takes ~6h/day weekdays; smart work also enables promotion ($3k → $4k by year-end at current job)'
where north_stars = '';

alter table public.user_profile drop constraint if exists single_row;
alter table public.user_profile drop column if exists id;
alter table public.user_profile alter column user_id set not null;
alter table public.user_profile add primary key (user_id);

-- Telegram account linking. A user generates a one-time code on the dashboard,
-- opens the bot deep-link, and /start <code> binds their telegram_id.
create table if not exists public.telegram_links (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.telegram_link_codes (
  code       text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now()
);

-- RLS: each user sees only their own rows. Service-role (bot) bypasses this.
alter table public.entries             enable row level security;
alter table public.resumes             enable row level security;
alter table public.strategy_reports    enable row level security;
alter table public.weekly_plans        enable row level security;
alter table public.user_profile        enable row level security;
alter table public.telegram_links      enable row level security;
alter table public.telegram_link_codes enable row level security;

create policy own_rows on public.entries             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.resumes             for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.strategy_reports    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.weekly_plans        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.user_profile        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.telegram_links      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own_rows on public.telegram_link_codes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
