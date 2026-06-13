-- Orbit: persist the exact prompt sent to the AI for each strategy report.
--
-- system_prompt: the full instruction block (north stars + profile + resumes + structure).
-- user_content: the JSON context (counts + recent_entries + sprint state).
--
-- Letting the user see the inputs makes the output trustable AND copy-pasteable
-- into a different model (Opus, GPT-5, etc.) for honest comparison.

alter table public.strategy_reports
  add column if not exists system_prompt text not null default '',
  add column if not exists user_content  text not null default '';
