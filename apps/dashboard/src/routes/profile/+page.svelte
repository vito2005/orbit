<script lang="ts">
    import { page } from '$app/state'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const justSaved = $derived(page.url.searchParams.get('saved') === '1')
    const resumeAdded = $derived(page.url.searchParams.get('resume_added') === '1')
    const resumeUpdated = $derived(page.url.searchParams.get('resume_updated') === '1')
    const resumeDeleted = $derived(page.url.searchParams.get('resume_deleted') === '1')
    const lastUpdated = $derived(formatDate(data.profile.updated_at))

    let editingId = $state<string | null>(null)

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
    Этот контекст подаётся вместе с north stars во все планировочные функции AI. Чем больше деталей про твой опыт — тем
    точнее план.
</p>

{#if justSaved || resumeAdded || resumeUpdated || resumeDeleted}
    <p class="reasoning">
        {#if justSaved}Профиль сохранён.{/if}
        {#if resumeAdded}Резюме добавлено.{/if}
        {#if resumeUpdated}Резюме обновлено.{/if}
        {#if resumeDeleted}Резюме удалено.{/if}
    </p>
{/if}
{#if form?.error}
    <p class="error">{form.error}</p>
{/if}

<section class="plan-section">
    <h2>О себе (короткий текст)</h2>
    <form method="POST" action="?/save" class="profile-form">
        <textarea
            name="about_me"
            rows="14"
            placeholder="Frontend dev с N годами опыта. Стек: ... Сильные стороны: ... Слабые: ... Что заряжает: ... Что тормозит: ... Семейная ситуация: ..."
            >{data.profile.about_me}</textarea
        >
        <div class="profile-form-actions">
            <button type="submit" class="btn-primary">Сохранить</button>
            <span class="muted" style="font-size: 12px;">{data.profile.about_me.length} символов</span>
        </div>
    </form>
</section>

<section class="plan-section">
    <h2>Резюме ({data.resumes.length})</h2>

    <form method="POST" action="?/uploadResume" enctype="multipart/form-data" class="resume-upload">
        <input type="text" name="label" placeholder="Название (например, Senior FE для Vercel)" required />
        <input type="file" name="pdf" accept="application/pdf" required />
        <button type="submit" class="btn-secondary">Загрузить PDF</button>
    </form>

    {#if data.resumes.length === 0}
        <p class="muted" style="font-size: 13px; margin: 12px 0 0;">
            Пока пусто. Загрузи PDF-резюме под разные позиции — AI будет видеть все версии как разные ракурсы твоего
            опыта.
        </p>
    {:else}
        <ul class="resume-list">
            {#each data.resumes as r (r.id)}
                <li class="resume-item">
                    {#if editingId === r.id}
                        <form method="POST" action="?/updateResume" class="resume-edit-form">
                            <input type="hidden" name="id" value={r.id} />
                            <input type="text" name="label" value={r.label} required />
                            <textarea name="content_text" rows="14">{r.content_text}</textarea>
                            <div class="resume-item-actions">
                                <button type="submit" class="btn-primary">Сохранить</button>
                                <button
                                    type="button"
                                    class="link-button"
                                    onclick={() => {
                                        editingId = null
                                    }}>отмена</button
                                >
                            </div>
                        </form>
                    {:else}
                        <div class="resume-item-head">
                            <strong>{r.label}</strong>
                            <span class="muted" style="font-size: 12px;">
                                {r.content_text.length} символов · {formatDate(r.created_at)}
                            </span>
                        </div>
                        <p class="resume-item-preview">
                            {r.content_text.slice(0, 280)}{r.content_text.length > 280 ? '…' : ''}
                        </p>
                        <div class="resume-item-actions">
                            <button
                                type="button"
                                class="card-action"
                                onclick={() => {
                                    editingId = r.id
                                }}>Редактировать</button
                            >
                            <form
                                method="POST"
                                action="?/deleteResume"
                                onsubmit={(ev) => {
                                    if (!confirm(`Удалить резюме «${r.label}»?`)) ev.preventDefault()
                                }}
                            >
                                <input type="hidden" name="id" value={r.id} />
                                <button type="submit" class="card-action card-action-danger">Удалить</button>
                            </form>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</section>
