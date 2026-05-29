<script lang="ts">
    import { CATEGORIES, type Entry, PRIORITIES } from '@orbit/shared'

    import { categoryEmoji } from '$lib/format'

    const { entry, redirectTo }: { entry: Entry; redirectTo: string } = $props()

    function autoSubmit(e: Event): void {
        const target = e.currentTarget as HTMLSelectElement
        target.form?.requestSubmit()
    }

    function todayPlusDays(days: number): string {
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const d = new Date()
        d.setDate(d.getDate() + days)
        return d.toISOString().slice(0, 10)
    }
</script>

<div class="entry-edit">
    <form method="POST" action="/entries/{entry.id}?/setPriority" class="entry-edit-form">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <select
            name="priority"
            onchange={autoSubmit}
            aria-label="Приоритет"
            class="entry-edit-select badge {entry.priority}"
        >
            {#each PRIORITIES as p (p)}
                <option value={p} selected={entry.priority === p}>{p.replace('_', ' ')}</option>
            {/each}
        </select>
    </form>

    <form method="POST" action="/entries/{entry.id}?/setCategory" class="entry-edit-form">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <select name="category" onchange={autoSubmit} aria-label="Категория" class="entry-edit-select">
            {#each CATEGORIES as c (c)}
                <option value={c} selected={entry.category === c}>{categoryEmoji(c)} {c}</option>
            {/each}
        </select>
    </form>

    {#if entry.scheduled_for}
        <form method="POST" action="/entries/{entry.id}?/scheduleFor" class="entry-edit-form">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="date" value={todayPlusDays(1)} />
            <button type="submit" class="entry-edit-chip" title="Move to tomorrow">→ завтра</button>
        </form>
        <form method="POST" action="/entries/{entry.id}?/scheduleFor" class="entry-edit-form">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="date" value="" />
            <button type="submit" class="entry-edit-chip" title="Unschedule">снять</button>
        </form>
    {:else}
        <form method="POST" action="/entries/{entry.id}?/scheduleFor" class="entry-edit-form">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="date" value={todayPlusDays(0)} />
            <button type="submit" class="entry-edit-chip" title="Plan for today">→ сегодня</button>
        </form>
        <form method="POST" action="/entries/{entry.id}?/scheduleFor" class="entry-edit-form">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <input type="hidden" name="date" value={todayPlusDays(1)} />
            <button type="submit" class="entry-edit-chip" title="Plan for tomorrow">→ завтра</button>
        </form>
    {/if}
</div>
