-- 20260823120000_user_categories seeded English category names, so the Russian
-- DEFAULT_CATEGORIES never applied: withFallback only substitutes them when the
-- stored list is empty. Remap the profile list and the rows already classified
-- with the old names, so the category filter keeps matching them.
-- raw_ai_json is left alone on purpose — it is the AI's original analysis.

update entries
set category = case category
        when 'work' then 'работа'
        when 'personal' then 'личное'
        when 'family' then 'семья'
        when 'health' then 'здоровье'
        when 'money' then 'деньги'
        when 'content' then 'контент'
        when 'standup' then 'стендап'
        when 'random' then 'разное'
        else category
    end
where category in ('work', 'personal', 'family', 'health', 'money', 'content', 'standup', 'random');

-- Order is meaningful: the prompt describes the last entry as the catch-all and
-- normalizeAnalysis falls back to it. 'разное' stays last, as 'random' was.
-- Only rows still holding the untouched seed are updated — a customised list wins.
update user_profile
set categories = array['работа', '3d', 'контент', 'стендап', 'семья', 'деньги', 'здоровье', 'личное', 'разное'],
    updated_at = now()
where categories = array['work', '3d', 'content', 'standup', 'family', 'money', 'health', 'personal', 'random'];
