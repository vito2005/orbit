<script lang="ts">
    import { categoryEmoji, formatRelative } from '$lib/format'
    import { emptyBox, hubList, hubRow, hubTitle } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const recent = $derived(data.recent)
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4.5">
    <div class="max-w-165">
        <h1 class="m-0 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Недавние капчуры
        </h1>
        <p class="mt-1 text-[13px] text-muted">Последнее, что ты скинул в бот.</p>
    </div>
    <a href="/inbox" class="text-xs text-muted">Все →</a>
</div>

{#if recent.length === 0}
    <div class={emptyBox}>
        <p class="m-0 max-w-[44ch]">Пусто. Скинь идею в бот.</p>
    </div>
{:else}
    <ul class={hubList}>
        {#each recent as entry (entry.id)}
            <li class={hubRow}>
                <span class="font-mono text-[10px] tabular-nums text-muted">{formatRelative(entry.created_at)}</span>
                <a href="/entries/{entry.id}" class="{hubTitle} text-text">
                    {categoryEmoji(entry.category)}
                    {entry.title}
                </a>
            </li>
        {/each}
    </ul>
{/if}
