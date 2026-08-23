-- Categories move from a hardcoded list in the code to a per-user array, so a
-- new account is not stuck with categories built around one person's life.
--
-- Additive and safe: the column arrives with a generic default. Existing rows are
-- seeded with the old hardcoded list, because their entries are already
-- classified with those values and would otherwise reference names the owner no
-- longer has.

alter table public.user_profile
  add column if not exists categories text[] not null
  default array['work', 'personal', 'family', 'health', 'money', 'content', 'ideas', 'random'];

update public.user_profile
set categories = array['work', '3d', 'content', 'standup', 'family', 'money', 'health', 'personal', 'random'];
