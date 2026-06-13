<script lang="ts">
    import { categoryEmoji, formatRelative } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const recent = $derived(data.recent)
</script>

<div class="today-head">
    <div>
        <h1>Недавние капчуры</h1>
        <p class="muted" style="font-size: 13px; margin: 4px 0 0;">Последнее, что ты скинул в бот.</p>
    </div>
    <a href="/inbox" class="muted" style="font-size: 12px;">Все →</a>
</div>

{#if recent.length === 0}
    <div class="empty">
        <p>Пусто. Скинь идею в бот.</p>
    </div>
{:else}
    <ul class="hub-list">
        {#each recent as entry (entry.id)}
            <li class="hub-row">
                <span class="hub-meta-time">{formatRelative(entry.created_at)}</span>
                <a href="/entries/{entry.id}" class="hub-title">
                    {categoryEmoji(entry.category)}
                    {entry.title}
                </a>
            </li>
        {/each}
    </ul>
{/if}
