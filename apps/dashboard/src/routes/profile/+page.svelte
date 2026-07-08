<script lang="ts">
    import { page } from '$app/state'
    import {
        btnPrimary,
        btnSecondary,
        calloutError,
        calloutReasoning,
        cardAction,
        cardActionDanger,
        linkButton,
    } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const justSaved = $derived(page.url.searchParams.get('saved') === '1')
    const hoursSaved = $derived(page.url.searchParams.get('hours_saved') === '1')
    const resumeAdded = $derived(page.url.searchParams.get('resume_added') === '1')
    const resumeUpdated = $derived(page.url.searchParams.get('resume_updated') === '1')
    const resumeDeleted = $derived(page.url.searchParams.get('resume_deleted') === '1')
    const lastUpdated = $derived(formatDate(data.profile.updated_at))

    let editingId = $state<string | null>(null)

    function formatDate(iso: string): string {
        const d = new Date(iso)
        return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    }

    function hoursLabel(h: number): string {
        if (h < 1) {
            return `${h * 60} минут`
        }
        const rest = h % 1 === 0 ? h % 10 : -1
        const word = rest === 1 ? 'час' : rest >= 2 && rest <= 4 ? 'часа' : 'часов'
        return `${h} ${word}`
    }
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4.5">
    <h1 class="m-0 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">Профиль</h1>
    <span class="text-muted">обновлён {lastUpdated}</span>
</div>

<p class="mb-3.5 text-[13px] text-muted">
    Этот контекст подаётся вместе с north stars во все планировочные функции AI. Чем подробнее описан твой опыт, тем
    точнее будет план.
</p>

{#if justSaved || hoursSaved || resumeAdded || resumeUpdated || resumeDeleted}
    <p class={calloutReasoning}>
        {#if justSaved}Профиль сохранён.{/if}
        {#if hoursSaved}Бюджет времени сохранён.{/if}
        {#if resumeAdded}Резюме добавлено.{/if}
        {#if resumeUpdated}Резюме обновлено.{/if}
        {#if resumeDeleted}Резюме удалено.{/if}
    </p>
{/if}
{#if form?.error}
    <p class={calloutError}>{form.error}</p>
{/if}

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Сколько часов в день на задачи</h2>
    <p class="mb-3 text-[13px] text-muted">
        Реальный бюджет вне основной работы. От него AI отталкивается, выбирая размер задач для стратегии и плана на
        неделю.
    </p>
    <form method="POST" action="?/saveHours" class="flex flex-wrap items-center gap-2.5">
        <select name="daily_hours" value={Number(data.profile.daily_hours)} class="w-auto">
            {#each data.hoursOptions as h (h)}
                <option value={h}>{hoursLabel(h)} в день</option>
            {/each}
        </select>
        <button type="submit" class={btnPrimary}>Сохранить</button>
    </form>
</section>

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">О себе (короткий текст)</h2>
    <form method="POST" action="?/save">
        <textarea
            name="about_me"
            rows="14"
            class="min-h-75"
            placeholder="Frontend dev с N годами опыта. Стек: ... Сильные стороны: ... Слабые: ... Что заряжает: ... Что тормозит: ... Семейная ситуация: ..."
            >{data.profile.about_me}</textarea
        >
        <div class="mt-3 flex flex-wrap items-center gap-2.5">
            <button type="submit" class={btnPrimary}>Сохранить</button>
            <span class="text-xs text-muted">{data.profile.about_me.length} символов</span>
        </div>
    </form>
</section>

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Резюме ({data.resumes.length})</h2>

    <form
        method="POST"
        action="?/uploadResume"
        enctype="multipart/form-data"
        class="mb-4.5 grid grid-cols-1 gap-2.25 rounded-box border border-border bg-paper/65 p-3.5 sm:grid-cols-[minmax(220px,1fr)_auto_auto] sm:items-center"
    >
        <input type="text" name="label" placeholder="Название (например, Senior FE для Vercel)" required />
        <input type="file" name="pdf" accept="application/pdf" class="text-xs text-text-2" required />
        <button type="submit" class={btnSecondary}>Загрузить PDF</button>
    </form>

    {#if data.resumes.length === 0}
        <p class="mt-3 text-[13px] text-muted">
            Пока пусто. Загрузи PDF-резюме под разные позиции. AI будет видеть все версии как разные ракурсы твоего
            опыта.
        </p>
    {:else}
        <ul class="m-0 grid list-none gap-2.5 p-0">
            {#each data.resumes as r (r.id)}
                <li class="rounded-card border border-border bg-surface/80 p-4.25 shadow-soft">
                    {#if editingId === r.id}
                        <form method="POST" action="?/updateResume" class="grid gap-2.25">
                            <input type="hidden" name="id" value={r.id} />
                            <input type="text" name="label" value={r.label} required />
                            <textarea name="content_text" rows="14" class="min-h-60">{r.content_text}</textarea>
                            <div class="mt-3 flex flex-wrap items-center gap-2.5">
                                <button type="submit" class={btnPrimary}>Сохранить</button>
                                <button
                                    type="button"
                                    class={linkButton}
                                    onclick={() => {
                                        editingId = null
                                    }}>отмена</button
                                >
                            </div>
                        </form>
                    {:else}
                        <div class="mb-1.75 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                            <strong class="font-serif text-[18px] font-medium">{r.label}</strong>
                            <span class="text-xs text-muted">
                                {r.content_text.length} символов · {formatDate(r.created_at)}
                            </span>
                        </div>
                        <p class="m-0 text-[13px] leading-[1.6] whitespace-pre-wrap text-text-2">
                            {r.content_text.slice(0, 280)}{r.content_text.length > 280 ? '…' : ''}
                        </p>
                        <div class="mt-3 flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                class={cardAction}
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
                                <button type="submit" class={cardActionDanger}>Удалить</button>
                            </form>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</section>
