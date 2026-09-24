<script lang="ts">
    import { formatDuration, formatRelative } from '$lib/format'
    import { card, emptyBox } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
</script>

{#if data.translations.length === 0}
    <div class={emptyBox}>
        <p class="m-0 max-w-[44ch]">
            Переводов пока нет. Пришли боту ссылку на Reels или YouTube Shorts — переведу с английского и объясню шутки.
        </p>
    </div>
{:else}
    {#each data.translations as translation (translation.id)}
        <article class={card}>
            <div class="mb-2 flex items-baseline justify-between gap-3">
                <h3 class="m-0 font-serif text-[19px] font-medium leading-[1.24]">
                    <a
                        href="/translations/{translation.id}"
                        class="text-text hover:text-accent-hover hover:no-underline"
                    >
                        🎬 {translation.title}
                    </a>
                </h3>
                <span class="shrink-0 font-mono text-[11px] tabular-nums text-muted whitespace-nowrap">
                    {formatRelative(translation.created_at)}
                </span>
            </div>
            {#if translation.summary}
                <p class="mt-1.5 mb-0 max-w-[66ch] text-sm leading-[1.6] text-text-2">{translation.summary}</p>
            {/if}
            <p class="mt-2 mb-0 font-mono text-[11px] text-muted">{formatDuration(translation.duration_seconds)}</p>
        </article>
    {/each}
{/if}
