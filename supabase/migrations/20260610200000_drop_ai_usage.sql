-- Orbit: drop AI usage tracking.
-- User decided cost tracking adds complexity without benefit at his scale.
-- OpenAI / Anthropic dashboards already show actual spend.
-- All historical usage rows are deleted with the table.

drop table if exists public.ai_usage;
