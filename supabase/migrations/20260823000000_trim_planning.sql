-- Removes the planning half of the product: strategy reports, weekly plans,
-- resumes, and the profile fields that only fed them (north stars, daily hours).
-- Entries and profiles themselves are untouched.
--
-- DESTRUCTIVE: drops user content. Run only after exporting anything worth keeping.

drop table if exists public.strategy_reports;
drop table if exists public.weekly_plans;
drop table if exists public.resumes;

alter table public.user_profile drop column if exists north_stars;
alter table public.user_profile drop column if exists daily_hours;
