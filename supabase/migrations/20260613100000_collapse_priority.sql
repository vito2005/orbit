-- Orbit: collapse priority triage to a flat backlog.
--
-- The now/this_week/later distinction was never used in practice — the bot
-- captures ideas into one stack and the user reviews them as a flat list.
-- Priority now holds exactly two states:
--   backlog  — active, visible in the inbox
--   archive  — dismissed / hidden
--
-- No rows are deleted. Existing now/this_week/later entries become 'backlog';
-- 'archive' entries are untouched.

-- Drop the existing CHECK on priority regardless of its auto-generated name.
do $$
declare
  c text;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.entries'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%priority%'
  loop
    execute format('alter table public.entries drop constraint %I', c);
  end loop;
end $$;

update public.entries
set priority = 'backlog'
where priority in ('now', 'this_week', 'later');

alter table public.entries alter column priority set default 'backlog';

alter table public.entries
  add constraint entries_priority_check check (priority in ('backlog', 'archive'));
