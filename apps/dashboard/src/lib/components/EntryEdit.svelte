<script lang="ts">
    import type { Entry } from '@orbit/shared'

    import { categoryEmoji } from '$lib/format'

    const { entry, redirectTo, categories }: { entry: Entry; redirectTo: string; categories: string[] } = $props()

    function autoSubmit(e: Event): void {
        const target = e.currentTarget as HTMLSelectElement
        target.form?.requestSubmit()
    }
</script>

<div class="mt-3 flex flex-wrap items-center gap-1.5">
    <form method="POST" action="/entries/{entry.id}?/setCategory" class="m-0 inline-flex">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <select
            name="category"
            onchange={autoSubmit}
            aria-label="Категория"
            class="w-auto min-h-7.75 cursor-pointer rounded-full border-border bg-surface-2 py-1 pr-7.5 pl-2.5 text-[11px] text-text-2"
        >
            {#if !categories.includes(entry.category)}
                <option value={entry.category} selected>{entry.category}</option>
            {/if}
            {#each categories as c (c)}
                <option value={c} selected={entry.category === c}>{categoryEmoji(c)} {c}</option>
            {/each}
        </select>
    </form>
</div>
