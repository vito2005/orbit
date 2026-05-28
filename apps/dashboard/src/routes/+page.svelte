<script lang="ts">
    import { categoryEmoji, formatRelative, priorityLabel } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
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
        Filtered to <strong>{priorityLabel(data.filters.priority)}</strong> — <a href="/">clear</a>
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
                <span class="meta">
                    <span class="badge {entry.priority}">{entry.priority.replace('_', ' ')}</span>
                    &nbsp;{formatRelative(entry.created_at)}
                </span>
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
        </article>
    {/each}
{/if}
