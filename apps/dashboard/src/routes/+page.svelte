<script lang="ts">
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji, formatRelative } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const entries = $derived(data.entries)
    const stale = $derived(data.stale)
    const recent = $derived(data.recent)
    const parentTitles = $derived(data.parentTitles)
    const subtaskCounts = $derived(data.subtaskCounts)
    const backlogCount = $derived(data.backlogCount)
</script>

<div class="today-head">
    <div>
        <h1>Что делать</h1>
        <p class="muted" style="font-size: 13px; margin: 4px 0 0;">
            Стек по приоритету. Сверху — самое важное. Закрыл → следующая.
        </p>
    </div>
    <span class="muted" style="font-size: 12px;">
        {entries.length} открытых · {backlogCount} в backlog
    </span>
</div>

{#if entries.length === 0}
    <div class="empty">
        <p>Пусто. Скинь идею в бот.</p>
    </div>
{:else}
    <ul class="now-stack">
        {#each entries as entry (entry.id)}
            <li class="now-card">
                <form method="POST" action="?/done" class="done-form">
                    <input type="hidden" name="id" value={entry.id} />
                    <button type="submit" class="done-toggle" aria-label="Mark done">○</button>
                </form>
                <div class="now-body">
                    {#if entry.parent_id && parentTitles[entry.parent_id]}
                        <a href="/entries/{entry.parent_id}" class="parent-chip">↑ {parentTitles[entry.parent_id]}</a>
                    {/if}
                    <a href="/entries/{entry.id}" class="now-title">
                        {categoryEmoji(entry.category)}
                        {entry.title}
                    </a>
                    {#if entry.next_action}
                        <p class="next-action">{entry.next_action}</p>
                    {/if}
                    <div class="now-meta">
                        <span class="badge {entry.priority}">{entry.priority.replace('_', ' ')}</span>
                        {#if subtaskCounts[entry.id]}
                            <a href="/entries/{entry.id}" class="subtask-chip"
                                >↳ {subtaskCounts[entry.id].done}/{subtaskCounts[entry.id].total} подзадач</a
                            >
                        {/if}
                    </div>
                    <EntryEdit {entry} redirectTo="/" />
                </div>
            </li>
        {/each}
    </ul>
{/if}

{#if stale.length > 0}
    <details class="stale-section">
        <summary>🪦 Старые задачи ({stale.length})</summary>
        <p class="muted" style="font-size: 12px; margin: 8px 0 12px;">
            Висят больше 14 дней. Bullet-Journal-правило: если переносил 3 раза — удали без сожаления.
        </p>
        <ul class="now-stack">
            {#each stale as entry (entry.id)}
                <li class="now-card stale">
                    <form method="POST" action="?/archive" class="done-form">
                        <input type="hidden" name="id" value={entry.id} />
                        <button type="submit" class="done-toggle stale-toggle" title="Archive" aria-label="Archive"
                            >📦</button
                        >
                    </form>
                    <div class="now-body">
                        <a href="/entries/{entry.id}" class="now-title">
                            {categoryEmoji(entry.category)}
                            {entry.title}
                        </a>
                        <div class="now-meta">
                            <span class="muted">висит {formatRelative(entry.created_at)}</span>
                            <span class="badge {entry.priority}">{entry.priority.replace('_', ' ')}</span>
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    </details>
{/if}

{#if recent.length > 0}
    <section class="hub-section" style="margin-top: 32px;">
        <div class="hub-section-head">
            <h2><a href="/inbox">Недавние капчуры</a></h2>
        </div>
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
    </section>
{/if}
