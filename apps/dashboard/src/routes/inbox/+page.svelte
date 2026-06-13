<script lang="ts">
    import { SvelteURLSearchParams } from 'svelte/reactivity'

    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji, formatRelative, priorityLabel } from '$lib/format'
    import { btnPrimary, card, cardAction, cardActionDanger, chip, emptyBox } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()

    const redirectTo = $derived(buildRedirectTo(data.filters))

    function buildRedirectTo(filters: { search: string; category: string; priority: string }): string {
        const params = new SvelteURLSearchParams()
        if (filters.search) params.set('q', filters.search)
        if (filters.category) params.set('category', filters.category)
        if (filters.priority) params.set('priority', filters.priority)
        const qs = params.toString()
        return qs ? `/inbox?${qs}` : '/inbox'
    }
</script>

<form
    class="mb-6 grid grid-cols-1 gap-2 rounded-box border border-border bg-paper/80 p-2.5 sm:grid-cols-[minmax(220px,1fr)_auto_auto]"
    method="GET"
>
    <input type="search" name="q" placeholder="Search title, summary, transcript…" value={data.filters.search} />
    <select name="category">
        <option value="">All categories</option>
        {#each data.categories as cat (cat)}
            <option value={cat} selected={data.filters.category === cat}>
                {categoryEmoji(cat)}
                {cat}
            </option>
        {/each}
    </select>
    {#if data.filters.priority}
        <input type="hidden" name="priority" value={data.filters.priority} />
    {/if}
    <button type="submit" class={btnPrimary}>Filter</button>
</form>

{#if data.filters.priority}
    <p class="mb-3 text-[13px] text-muted">
        Filtered to <strong>{priorityLabel(data.filters.priority)}</strong>. <a href="/inbox">Clear filter</a>
    </p>
{/if}

{#if data.entries.length === 0}
    <div class={emptyBox}>
        <p class="m-0 max-w-[44ch]">No entries yet. Send a voice or text to your Telegram bot to get started.</p>
    </div>
{:else}
    {#each data.entries as entry (entry.id)}
        <article class={card}>
            <div class="mb-2 flex items-baseline justify-between gap-3">
                <h3 class="m-0 font-serif text-[19px] font-medium leading-[1.24]">
                    <a href="/entries/{entry.id}" class="text-text hover:text-accent-hover hover:no-underline">
                        {categoryEmoji(entry.category)}
                        {entry.title}
                    </a>
                </h3>
                <span class="shrink-0 font-mono text-[11px] tabular-nums text-muted whitespace-nowrap">
                    {formatRelative(entry.created_at)}
                </span>
            </div>
            {#if entry.summary}
                <p class="mt-1.5 mb-2.5 max-w-[66ch] text-sm leading-[1.6] text-text-2">{entry.summary}</p>
            {/if}
            {#if entry.next_action}
                <p class="my-2 font-serif text-[15px] italic leading-[1.4] text-accent-hover before:content-['↳_']">
                    {entry.next_action}
                </p>
            {/if}
            {#if entry.tags.length > 0}
                <div class="flex flex-wrap gap-1.5">
                    {#each entry.tags as tag (tag)}
                        <span class={chip}>#{tag}</span>
                    {/each}
                </div>
            {/if}
            <EntryEdit {entry} {redirectTo} />
            <div class="mt-4 flex gap-1.75 border-t border-border pt-3">
                {#if entry.priority === 'archive'}
                    <form method="POST" action="/entries/{entry.id}?/setPriority">
                        <input type="hidden" name="priority" value="backlog" />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" class={cardAction}>Unarchive</button>
                    </form>
                {:else}
                    <form method="POST" action="/entries/{entry.id}?/archive">
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" class={cardAction}>Archive</button>
                    </form>
                {/if}
                <form
                    method="POST"
                    action="/entries/{entry.id}?/delete"
                    onsubmit={(ev) => {
                        if (!confirm('Delete this entry permanently?')) ev.preventDefault()
                    }}
                >
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <button type="submit" class={cardActionDanger}>Delete</button>
                </form>
            </div>
        </article>
    {/each}
{/if}
