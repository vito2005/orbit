<script lang="ts">
    import { daysLeftWord, daysSince, type Entry, isStale } from '@orbit/shared'

    import { page } from '$app/state'
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji } from '$lib/format'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const entries = $derived(data.entries)
    const sprint = $derived(data.sprint)
    const grouped = $derived(groupByCategory(entries))
    const movedCount = $derived(Number(page.url.searchParams.get('moved') ?? '0'))
    const unscheduledCount = $derived(
        entries.filter((e) => e.priority === 'this_week' && !e.scheduled_for && !e.done_at).length,
    )

    function groupByCategory(list: Entry[]): { category: string; items: Entry[] }[] {
        const order: string[] = []
        const buckets: Record<string, Entry[]> = {}
        for (const e of list) {
            if (!(e.category in buckets)) {
                buckets[e.category] = []
                order.push(e.category)
            }
            buckets[e.category].push(e)
        }
        return order.map((category) => ({ category, items: buckets[category] }))
    }
</script>

<div class="today-head">
    <div>
        <h1>Эта неделя</h1>
        <p class="sprint-line">
            Спринт {sprint.label} · <strong>{daysLeftWord(sprint.daysLeft)}</strong>
        </p>
    </div>
    <div class="week-actions">
        <span class="muted">{entries.length} незавершённых</span>
        <form method="POST" action="?/generateSprint">
            <button type="submit" class="btn-primary">
                {entries.length > 0 ? 'AI: добрать в спринт' : 'AI: сгенерировать спринт'}
            </button>
        </form>
        {#if unscheduledCount > 0}
            <form
                method="POST"
                action="?/demoteAll"
                onsubmit={(ev) => {
                    if (!confirm(`Перенести ${unscheduledCount} незапланированных в backlog?`)) {
                        ev.preventDefault()
                    }
                }}
            >
                <button type="submit" class="btn-secondary">Всё в backlog ({unscheduledCount})</button>
            </form>
        {/if}
    </div>
</div>

{#if movedCount > 0}
    <p class="reasoning">Перенесено {movedCount} в backlog.</p>
{/if}

{#if form && 'reasoning' in form && form.reasoning}
    <p class="reasoning">
        <strong>Спринт собран ({form.picked} задач):</strong>
        {form.reasoning}
    </p>
{/if}
{#if form && 'error' in form && form.error}
    <p class="error">{form.error}</p>
{/if}

{#if entries.length === 0}
    <div class="empty">
        <p>Нет активных задач в this_week / now. Скинь идею в бот или открой <a href="/">All</a>.</p>
    </div>
{:else}
    {#each grouped as group (group.category)}
        <section class="plan-section">
            <h2>{categoryEmoji(group.category)} {group.category}</h2>
            {#each group.items as entry (entry.id)}
                <article class="card week-card">
                    <div class="today-body">
                        {#if entry.parent_id && data.parentTitles[entry.parent_id]}
                            <a href="/entries/{entry.parent_id}" class="parent-chip"
                                >↑ {data.parentTitles[entry.parent_id]}</a
                            >
                        {/if}
                        <a href="/entries/{entry.id}" class="today-title">{entry.title}</a>
                        {#if entry.next_action}
                            <p class="next-action">{entry.next_action}</p>
                        {/if}
                        <div class="today-meta">
                            {#if entry.scheduled_for}
                                <span class="muted">Запланировано на {entry.scheduled_for}</span>
                            {/if}
                            {#if isStale(entry.created_at, sprint)}
                                <span class="stale-chip">в плане {daysSince(entry.created_at, sprint.today)} дн.</span>
                            {/if}
                            {#if data.subtaskCounts[entry.id]}
                                <a href="/entries/{entry.id}" class="subtask-chip"
                                    >↳ {data.subtaskCounts[entry.id].done}/{data.subtaskCounts[entry.id].total} подзадач</a
                                >
                            {/if}
                        </div>
                        <EntryEdit {entry} redirectTo="/week" />
                    </div>
                </article>
            {/each}
        </section>
    {/each}
{/if}
