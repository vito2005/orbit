<script lang="ts">
    import { goto } from '$app/navigation'
    import { page } from '$app/state'
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { doneAt, isArchived, isDone, removeEntry, toggleArchive, toggleDone } from '$lib/entries.svelte'
    import { categoryEmoji, formatDate } from '$lib/format'
    import {
        btnDanger,
        btnPrimary,
        btnSecondary,
        calloutReasoning,
        chip,
        hubList,
        hubRow,
        hubRowDone,
        hubTitle,
    } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const e = $derived(data.entry)
    const parent = $derived(data.parent)
    const subtasks = $derived(data.subtasks)
    const contextSaved = $derived(page.url.searchParams.get('context_saved') === '1')
    const doneSubtasks = $derived(subtasks.filter(isDone).length)

    async function handleDelete() {
        if (!confirm('Delete this entry permanently?')) {
            return
        }
        if (await removeEntry(e)) {
            await goto('/inbox')
        }
    }

    const detailSection = 'my-4 rounded-card border border-border bg-surface/82 p-4.5 shadow-soft md:px-5.5 md:py-5.25'
    const detailH2 = 'mb-2.5 font-serif text-[17px] font-medium italic text-text-2'
    const detailBody = 'm-0 text-sm leading-[1.68] whitespace-pre-wrap text-text-2'
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <a href="/inbox" class="text-[13px] text-text-2">← back to list</a>
    <div class="flex gap-2">
        <button type="button" class={isDone(e) ? btnSecondary : btnPrimary} onclick={() => toggleDone(e)}>
            {isDone(e) ? '↩ Вернуть в работу' : '✓ Отметить выполненной'}
        </button>
        <button type="button" class={btnSecondary} onclick={() => toggleArchive(e)}>
            {isArchived(e) ? 'Unarchive' : 'Archive'}
        </button>
        <button type="button" class={btnDanger} onclick={handleDelete}>Delete</button>
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
        {#if isDone(e)}
            &nbsp;·&nbsp; <span class="text-ok">✓ выполнено {formatDate(doneAt(e) as string)}</span>
        {/if}
    </div>
    <EntryEdit entry={e} redirectTo="/entries/{e.id}" />

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
            Программа курса, ToC книги, brief задачи, ссылки, ТЗ — всё, что стоит держать рядом с записью.
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

        {#if subtasks.length > 0}
            <ul class="{hubList} mb-3">
                {#each subtasks as st (st.id)}
                    <li class={isDone(st) ? hubRowDone : hubRow}>
                        <button
                            type="button"
                            aria-label={isDone(st) ? 'Вернуть в работу' : 'Отметить выполненной'}
                            onclick={() => toggleDone(st)}
                            class="cursor-pointer justify-self-center rounded-field border-0 bg-transparent px-2.5 py-1 text-base leading-none {isDone(
                                st,
                            )
                                ? 'text-ok'
                                : 'text-muted hover:text-accent-hover'}"
                        >
                            {isDone(st) ? '✓' : '○'}
                        </button>
                        <a href="/entries/{st.id}" class="{hubTitle} {isDone(st) ? 'text-text-2' : 'text-text'}">
                            {st.title}
                        </a>
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="m-0 text-[13px] text-muted">Подзадач нет.</p>
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
