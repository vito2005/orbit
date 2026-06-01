<script lang="ts">
    import { page } from '$app/state'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const justSaved = $derived(page.url.searchParams.get('saved') === '1')
    const lastUpdated = $derived(formatDate(data.profile.updated_at))

    function formatDate(iso: string): string {
        const d = new Date(iso)
        return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    }
</script>

<div class="today-head">
    <h1>Профиль</h1>
    <span class="muted">обновлён {lastUpdated}</span>
</div>

<p class="muted" style="font-size: 13px; margin: 0 0 14px;">
    Расскажи AI кто ты. Этот текст подаётся вместе с north stars во все планировочные функции — генерация плана на день,
    спринт, разбивка на подзадачи, мотивация. Можно скопировать сюда резюме, надиктовать через macOS Fn-Fn, или просто
    написать руками.
</p>

{#if justSaved}
    <p class="reasoning">Сохранено.</p>
{/if}
{#if form?.error}
    <p class="error">{form.error}</p>
{/if}

<form method="POST" action="?/save" class="profile-form">
    <textarea
        name="about_me"
        rows="20"
        placeholder="Frontend dev с N годами опыта. Стек: ... Last roles: ... Сильные стороны: ... Слабые стороны: ... Семейная ситуация: ... Что меня заряжает: ... Что меня тормозит: ..."
        >{data.profile.about_me}</textarea
    >
    <div class="profile-form-actions">
        <button type="submit" class="btn-primary">Сохранить</button>
        <span class="muted" style="font-size: 12px;">{data.profile.about_me.length} символов</span>
    </div>
</form>
