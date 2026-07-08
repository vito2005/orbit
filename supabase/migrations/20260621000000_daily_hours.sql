-- Orbit: per-day focus budget on the single user profile.
--
-- How many hours/day the user can realistically dedicate to tasks OUTSIDE the
-- day job. Feeds the AI planning prompts (strategy + weekly plan) so task SIZES
-- and the weekly distribution fit reality instead of the old hardcoded "3-4h".
-- Default 1 matches the user's current honest capacity.

alter table public.user_profile
  add column if not exists daily_hours numeric not null default 1;
