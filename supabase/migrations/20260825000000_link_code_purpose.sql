-- Codes now travel in both directions: the dashboard issues one to bind a
-- Telegram to an existing account, and the bot issues one to log a
-- Telegram-born account into the dashboard. Same shape, opposite meaning —
-- without a purpose a login code could be spent on a binding, and vice versa.
alter table public.telegram_link_codes
    add column if not exists purpose text not null default 'link';

alter table public.telegram_link_codes
    add constraint telegram_link_codes_purpose_check check (purpose in ('link', 'login'));
