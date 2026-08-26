-- 20260825000000 added `purpose` for a login-code table of our own. That table
-- never happened: the bot mints Supabase magic-link tokens instead, so Supabase
-- owns their single use and expiry, and a code here means one thing again.
alter table public.telegram_link_codes
    drop constraint if exists telegram_link_codes_purpose_check;

alter table public.telegram_link_codes
    drop column if exists purpose;
