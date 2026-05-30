-- Orbit: subtasks via parent_id self-reference.
-- A subtask is just a regular entry with parent_id set. Deleting the parent
-- cascades to children.

alter table public.entries
  add column if not exists parent_id uuid references public.entries(id) on delete cascade;

create index if not exists entries_parent_id_idx on public.entries (parent_id);
