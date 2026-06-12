<script lang="ts">
    import { CATEGORIES, type Entry, PRIORITIES } from '@orbit/shared'

    import { categoryEmoji } from '$lib/format'

    const { entry, redirectTo }: { entry: Entry; redirectTo: string } = $props()

    function autoSubmit(e: Event): void {
        const target = e.currentTarget as HTMLSelectElement
        target.form?.requestSubmit()
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
</div>
