<script lang="ts">
    import type { Entry } from '@orbit/shared'

    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const entries = $derived(data.entries)
    const grouped = $derived(groupByCategory(entries))

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
    <h1>Эта неделя</h1>
    <span class="muted">{entries.length} незавершённых</span>
</div>

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
                        <a href="/entries/{entry.id}" class="today-title">{entry.title}</a>
                        {#if entry.next_action}
                            <p class="next-action">{entry.next_action}</p>
                        {/if}
                        {#if entry.scheduled_for}
                            <p class="muted" style="font-size: 12px; margin: 4px 0 0;">
                                Запланировано на {entry.scheduled_for}
                            </p>
                        {/if}
                        <EntryEdit {entry} redirectTo="/week" />
                    </div>
                </article>
            {/each}
        </section>
    {/each}
{/if}
