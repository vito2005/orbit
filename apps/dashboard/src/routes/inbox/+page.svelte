<script lang="ts">
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji, formatRelative, priorityLabel } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()

    const redirectTo = $derived(buildRedirectTo(data.filters))

    function buildRedirectTo(filters: { search: string; category: string; priority: string }): string {
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const params = new URLSearchParams()
        if (filters.search) params.set('q', filters.search)
        if (filters.category) params.set('category', filters.category)
        if (filters.priority) params.set('priority', filters.priority)
        const qs = params.toString()
        return qs ? `/inbox?${qs}` : '/inbox'
    }
</script>

<form class="filters" method="GET">
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
    <button type="submit">Filter</button>
</form>

{#if data.filters.priority}
    <p style="color: var(--muted); font-size: 13px; margin-bottom: 12px;">
        Filtered to <strong>{priorityLabel(data.filters.priority)}</strong> — <a href="/inbox">clear</a>
    </p>
{/if}

{#if data.entries.length === 0}
    <div class="empty">
        <p>No entries yet. Send a voice or text to your Telegram bot to get started.</p>
    </div>
{:else}
    {#each data.entries as entry (entry.id)}
        <article class="card">
            <div class="row1">
                <h3>
                    <a href="/entries/{entry.id}">
                        {categoryEmoji(entry.category)}
                        {entry.title}
                    </a>
                </h3>
                <span class="meta">{formatRelative(entry.created_at)}</span>
            </div>
            {#if entry.summary}
                <p class="summary">{entry.summary}</p>
            {/if}
            {#if entry.next_action}
                <p class="next-action">{entry.next_action}</p>
            {/if}
            {#if entry.tags.length > 0}
                <div class="tags">
                    {#each entry.tags as tag (tag)}
                        <span class="chip">#{tag}</span>
                    {/each}
                </div>
            {/if}
            <EntryEdit {entry} {redirectTo} />
            <div class="card-actions">
                {#if entry.priority === 'archive'}
                    <form method="POST" action="/entries/{entry.id}?/setPriority">
                        <input type="hidden" name="priority" value="backlog" />
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" class="card-action">Unarchive</button>
                    </form>
                {:else}
                    <form method="POST" action="/entries/{entry.id}?/archive">
                        <input type="hidden" name="redirectTo" value={redirectTo} />
                        <button type="submit" class="card-action">Archive</button>
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
                    <button type="submit" class="card-action card-action-danger">Delete</button>
                </form>
            </div>
        </article>
    {/each}
{/if}
