<script lang="ts">
    import { daysLeftWord } from '@orbit/shared'

    import { categoryEmoji, formatRelative } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const today = $derived(data.today)
    const recent = $derived(data.recent)
    const sprint = $derived(data.sprint)
</script>

<p class="sprint-line hub-sprint">
    Спринт {sprint.label} · <strong>{daysLeftWord(sprint.daysLeft)}</strong>
</p>

<section class="hub-section">
    <div class="hub-section-head">
        <h2><a href="/today">Сегодня</a></h2>
        <span class="muted">
            {today.open.length} открытых
            {#if today.done.length > 0}· {today.done.length} сделано{/if}
        </span>
    </div>

    {#if today.open.length === 0 && today.done.length === 0}
        <p class="hub-empty">
            План пуст. <a href="/today">Сгенерировать</a> или взять задачу из <a href="/week">недели</a>.
        </p>
    {:else}
        <ul class="hub-list">
            {#each today.open as entry (entry.id)}
                <li class="hub-row">
                    <span class="hub-dot">○</span>
                    <a href="/entries/{entry.id}" class="hub-title">
                        {categoryEmoji(entry.category)}
                        {entry.title}
                    </a>
                </li>
            {/each}
            {#each today.done as entry (entry.id)}
                <li class="hub-row done">
                    <span class="hub-dot done">✓</span>
                    <a href="/entries/{entry.id}" class="hub-title done">
                        {categoryEmoji(entry.category)}
                        {entry.title}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</section>

<section class="hub-section">
    <div class="hub-section-head">
        <h2>Очереди</h2>
    </div>
    <div class="hub-queues">
        <a href="/week" class="hub-queue">
            <span class="hub-queue-label">На этой неделе</span>
            <span class="hub-queue-count">{data.weekOpenCount}</span>
        </a>
        <a href="/inbox?priority=later" class="hub-queue">
            <span class="hub-queue-label">Backlog</span>
            <span class="hub-queue-count">{data.backlogCount}</span>
        </a>
        <a href="/inbox" class="hub-queue">
            <span class="hub-queue-label">Все записи</span>
            <span class="hub-queue-count">→</span>
        </a>
    </div>
</section>

<section class="hub-section">
    <div class="hub-section-head">
        <h2><a href="/inbox">Недавние капчуры</a></h2>
    </div>
    {#if recent.length === 0}
        <p class="hub-empty">Пусто — скинь идею в бот.</p>
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
</section>
