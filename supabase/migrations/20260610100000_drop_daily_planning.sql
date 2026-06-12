-- Orbit: drop daily/weekly planning artifacts.
--
-- The system pivoted to a pull-based stack model. No per-day scheduling, no
-- weekly sprints. Entries live in a single sorted stack ordered by priority
-- and age until done or archived.
--
-- Data dropped: daily_plans table (AI's daily picks + reasoning + explanations),
-- entries.scheduled_for column (which day the user planned to do the task).
-- Other fields (priority, done_at, parent_id, motivation, extra_context) stay.

drop table if exists public.daily_plans;

drop index if exists public.entries_scheduled_for_idx;
alter table public.entries drop column if exists scheduled_for;
