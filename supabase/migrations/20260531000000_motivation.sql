-- Orbit: per-entry motivation text.
-- A motivational paragraph (2-4 sentences) tying the entry to the user's
-- north stars. Generated on demand by the user via a button on the entry
-- detail page; persisted so it survives reloads.

alter table public.entries
  add column if not exists motivation text;
