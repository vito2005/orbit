-- Orbit: per-entry extra context.
-- A free-form text field for source material the AI needs to plan accurately:
-- course curriculum (ToC), briefs, design specs, links, etc. AI is told to
-- request this when it cannot ground subtasks in real evidence.

alter table public.entries
  add column if not exists extra_context text;
