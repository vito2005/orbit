<script lang="ts">
    import { page } from '$app/state'
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji, formatDate } from '$lib/format'
    import {
        btnDanger,
        btnPrimary,
        btnSecondary,
        calloutError,
        calloutNeeds,
        calloutReasoning,
        chip,
        hubList,
        hubRow,
        hubTitle,
        linkButton,
    } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const e = $derived(data.entry)
    const parent = $derived(data.parent)
    const subtasks = $derived(data.subtasks)
    const suggestions = $derived(form && 'suggestions' in form ? form.suggestions : null)
    const needsContext = $derived(form && 'needsContext' in form ? form.needsContext : null)
    const contextSaved = $derived(page.url.searchParams.get('context_saved') === '1')
    const doneSubtasks = $derived(subtasks.filter((s) => s.done_at !== null).length)

    const detailSection = 'my-4 rounded-card border border-border bg-surface/82 p-4.5 shadow-soft md:px-5.5 md:py-5.25'
    const motivationSection =
        'my-4 rounded-card border border-accent/30 bg-surface/82 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent-soft)_86%,transparent),color-mix(in_srgb,var(--color-surface)_90%,transparent))] p-4.5 shadow-soft md:px-5.5 md:py-5.25'
    const detailH2 = 'mb-2.5 font-serif text-[17px] font-medium italic text-text-2'
    const detailBody = 'm-0 text-sm leading-[1.68] whitespace-pre-wrap text-text-2'
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <a href="/inbox" class="text-[13px] text-text-2">← back to list</a>
    <div class="flex gap-2">
        {#if e.priority === 'archive'}
            <form method="POST" action="?/setPriority">
                <input type="hidden" name="priority" value="backlog" />
                <button type="submit" class={btnSecondary}>Unarchive</button>
            </form>
        {:else}
            <form method="POST" action="?/archive">
                <button type="submit" class={btnSecondary}>Archive</button>
            </form>
        {/if}
        <form
            method="POST"
            action="?/delete"
            onsubmit={(ev) => {
                if (!confirm('Delete this entry permanently?')) ev.preventDefault()
            }}
        >
            <button type="submit" class={btnDanger}>Delete</button>
        </form>
    </div>
</div>

<div class="max-w-195">
    {#if parent}
        <p class="mb-2 text-[13px] text-text-2">
            ↑ часть задачи: <a href="/entries/{parent.id}">{categoryEmoji(parent.category)} {parent.title}</a>
        </p>
    {/if}
    <h1 class="mb-2.5 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
        {categoryEmoji(e.category)}
        {e.title}
    </h1>
    <div class="mb-3 font-mono text-[11px] leading-[1.8] tabular-nums text-muted">
        {e.type === 'voice' ? '🎤 voice' : '📝 text'}
        &nbsp;·&nbsp; energy: {e.energy}
        {#if e.content_potential !== null}
            &nbsp;·&nbsp; potential: {e.content_potential}/10
        {/if}
        &nbsp;·&nbsp; {formatDate(e.created_at)}
    </div>
    <EntryEdit entry={e} redirectTo="/entries/{e.id}" />

    <section class={motivationSection}>
        <h2 class={detailH2}>Зачем мне это</h2>
        {#if e.motivation}
            <p class="m-0 font-serif text-[18px] leading-[1.55] text-text">{e.motivation}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2.5">
                <form method="POST" action="?/generateMotivation">
                    <button type="submit" class={btnSecondary}>Перегенерировать</button>
                </form>
                <form method="POST" action="?/clearMotivation">
                    <button type="submit" class={linkButton}>очистить</button>
                </form>
            </div>
        {:else}
            <p class="mb-2 text-[13px] text-muted">
                Пока пусто. Попроси AI связать задачу с твоими north stars и описать что ты получишь, если доведёшь до
                конца.
            </p>
            <form method="POST" action="?/generateMotivation">
                <button type="submit" class={btnPrimary}>AI: написать мотивацию</button>
            </form>
        {/if}
    </section>

    {#if e.summary}
        <section class={detailSection}>
            <h2 class={detailH2}>Summary</h2>
            <p class={detailBody}>{e.summary}</p>
        </section>
    {/if}

    {#if e.next_action}
        <section class={detailSection}>
            <h2 class={detailH2}>Next action</h2>
            <p class={detailBody}>{e.next_action}</p>
        </section>
    {/if}

    {#if e.tags.length > 0}
        <section class={detailSection}>
            <h2 class={detailH2}>Tags</h2>
            <div class="flex flex-wrap gap-1.5">
                {#each e.tags as tag (tag)}
                    <span class={chip}>#{tag}</span>
                {/each}
            </div>
        </section>
    {/if}

    <section class={detailSection}>
        <h2 class={detailH2}>
            Контекст / источники
            {#if e.extra_context && e.extra_context.length > 0}
                <span class="font-normal text-muted">({e.extra_context.length} символов)</span>
            {/if}
        </h2>
        <p class="mb-2 text-xs text-muted">
            Программа курса, ToC книги, brief задачи, ссылки, ТЗ. AI использует это при разбивке на подзадачи и при
            мотивации.
        </p>
        {#if contextSaved}
            <p class={calloutReasoning}>Сохранено.</p>
        {/if}
        <form method="POST" action="?/setExtraContext">
            <textarea
                name="extra_context"
                rows="8"
                class="min-h-75"
                placeholder="Вставь сюда программу курса, brief задачи, ссылки или ТЗ. AI будет использовать этот контекст."
                >{e.extra_context ?? ''}</textarea
            >
            <div class="mt-3 flex flex-wrap items-center gap-2.5">
                <button type="submit" class={btnSecondary}>Сохранить контекст</button>
            </div>
        </form>
    </section>

    <section class={detailSection}>
        <h2 class={detailH2}>
            Подзадачи
            {#if subtasks.length > 0}
                <span class="font-normal text-muted">({doneSubtasks}/{subtasks.length})</span>
            {/if}
        </h2>

        {#if needsContext}
            <div class={calloutNeeds}>
                <p class="mb-1.5"><strong>AI просит больше контекста:</strong></p>
                <p class="mb-1.5">{needsContext}</p>
                <p class="mt-2 text-xs text-muted">
                    ↑ Вставь это в поле «Контекст / источники» выше, сохрани, и нажми «AI: разбить на подзадачи» ещё
                    раз.
                </p>
            </div>
        {/if}

        {#if subtasks.length > 0}
            <ul class="{hubList} mb-3">
                {#each subtasks as st (st.id)}
                    <li class="{hubRow} {st.done_at !== null ? 'opacity-[0.58]' : ''}">
                        <span class="w-5.5 text-center {st.done_at !== null ? 'text-ok' : 'text-muted'}">
                            {st.done_at !== null ? '✓' : '○'}
                        </span>
                        <a
                            href="/entries/{st.id}"
                            class="{hubTitle} {st.done_at !== null ? 'text-muted line-through' : 'text-text'}"
                        >
                            {st.title}
                        </a>
                    </li>
                {/each}
            </ul>
        {/if}

        {#if suggestions}
            <form method="POST" action="?/createSubtasks" class="mt-2.5 grid gap-2">
                <p class="mb-2 text-xs text-muted">
                    AI предложил {suggestions.length} подзадач. Сними галочки с лишних или подгенерируй ещё раз.
                </p>
                {#each suggestions as s (s.title)}
                    <label
                        class="flex cursor-pointer items-start gap-2.75 rounded-box border border-border bg-paper p-3 transition-colors duration-150 hover:border-accent hover:bg-surface"
                    >
                        <input
                            type="checkbox"
                            name="subtask"
                            value={JSON.stringify(s)}
                            class="mt-1 accent-accent"
                            checked
                        />
                        <div>
                            <div class="font-medium text-text">{s.title}</div>
                            {#if s.next_action}
                                <div class="my-2 font-serif text-[15px] italic leading-[1.4] text-accent-hover">
                                    ↳ {s.next_action}
                                </div>
                            {/if}
                        </div>
                    </label>
                {/each}
                <div class="mt-3 flex flex-wrap items-center gap-2.5">
                    <button type="submit" class={btnPrimary}>Создать выбранные</button>
                </div>
            </form>
        {:else}
            <form method="POST" action="?/suggestSplit">
                <button type="submit" class={btnSecondary}>
                    {subtasks.length > 0 ? 'AI: предложить ещё подзадачи' : 'AI: разбить на подзадачи'}
                </button>
            </form>
            {#if form && 'error' in form && form.error}
                <p class="{calloutError} mt-2">{form.error}</p>
            {/if}
        {/if}
    </section>

    {#if e.type === 'voice'}
        <section class={detailSection}>
            <h2 class={detailH2}>Audio</h2>
            {#if e.original_audio_url}
                <audio controls src={e.original_audio_url} class="w-full"></audio>
                <p class="mt-2 text-xs">
                    <a href={e.original_audio_url} target="_blank" rel="noopener">Open file</a>
                </p>
            {:else}
                <p class="m-0 text-[13px] text-muted">
                    Аудио-файл не сохранился (либо bucket не public, либо загрузка упала). Опирайся на транскрипт ниже.
                </p>
            {/if}
        </section>
    {/if}

    <section class={detailSection}>
        <h2 class={detailH2}>Transcript</h2>
        <pre class="m-0 font-sans text-sm leading-[1.68] whitespace-pre-wrap text-text-2">{e.transcript}</pre>
    </section>
</div>
