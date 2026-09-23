<script lang="ts">
    import { formatDate, formatDuration } from '$lib/format'
    import { btnDanger } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const translation = $derived(data.translation)

    function handleDeleteSubmit(event: SubmitEvent) {
        if (!confirm('Удалить перевод навсегда?')) {
            event.preventDefault()
        }
    }

    const detailSection = 'my-4 rounded-card border border-border bg-surface/82 p-4.5 shadow-soft md:px-5.5 md:py-5.25'
    const detailH2 = 'mb-2.5 font-serif text-[17px] font-medium italic text-text-2'
    const detailBody = 'm-0 font-sans text-sm leading-[1.68] whitespace-pre-wrap text-text-2'
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <a href="/translations" class="text-[13px] text-text-2">← к переводам</a>
    <form method="POST" action="?/delete" onsubmit={handleDeleteSubmit}>
        <button type="submit" class={btnDanger}>Удалить</button>
    </form>
</div>

<div class="max-w-195">
    <h1 class="mb-2.5 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
        {translation.title}
    </h1>
    <div class="mb-3 font-mono text-[11px] leading-[1.8] tabular-nums text-muted">
        🎬 {formatDuration(translation.duration_seconds)}
        &nbsp;·&nbsp; {formatDate(translation.created_at)}
        &nbsp;·&nbsp; <a href={translation.source_url} target="_blank" rel="noopener">оригинал</a>
    </div>

    {#if translation.summary}
        <p class="mb-4 max-w-[66ch] text-[15px] leading-[1.6] text-text-2">{translation.summary}</p>
    {/if}

    <section class={detailSection}>
        <h2 class={detailH2}>Перевод</h2>
        <pre class={detailBody}>{translation.translation}</pre>
    </section>

    {#if translation.notes.length > 0}
        <section class={detailSection}>
            <h2 class={detailH2}>Что тут не очевидно</h2>
            <dl class="m-0 grid gap-3">
                {#each translation.notes as note (note.phrase)}
                    <div>
                        <dt class="font-serif text-[15px] italic text-text">«{note.phrase}»</dt>
                        <dd class="m-0 mt-0.5 text-sm leading-[1.6] text-text-2">{note.explanation}</dd>
                    </div>
                {/each}
            </dl>
        </section>
    {/if}

    <section class={detailSection}>
        <h2 class={detailH2}>Оригинал</h2>
        <pre class={detailBody}>{translation.transcript}</pre>
    </section>
</div>
