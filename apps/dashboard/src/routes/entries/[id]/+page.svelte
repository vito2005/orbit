<script lang="ts">
    import { categoryEmoji, formatDate } from '$lib/format'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const e = $derived(data.entry)
</script>

<div class="detail-header">
    <a href="/" class="back">← back to list</a>
    <div class="detail-actions">
        {#if e.priority !== 'archive'}
            <form method="POST" action="?/archive">
                <button type="submit" class="btn-secondary">Archive</button>
            </form>
        {/if}
        <form
            method="POST"
            action="?/delete"
            onsubmit={(ev) => {
                if (!confirm('Delete this entry permanently?')) ev.preventDefault()
            }}
        >
            <button type="submit" class="btn-danger">Delete</button>
        </form>
    </div>
</div>

<div class="detail">
    <h1>{categoryEmoji(e.category)} {e.title}</h1>
    <div class="detail-meta">
        <span class="badge {e.priority}">{e.priority.replace('_', ' ')}</span>
        &nbsp;·&nbsp; {e.category}
        &nbsp;·&nbsp; energy: {e.energy}
        {#if e.content_potential !== null}
            &nbsp;·&nbsp; potential: {e.content_potential}/10
        {/if}
        &nbsp;·&nbsp; {formatDate(e.created_at)}
    </div>

    {#if e.summary}
        <section>
            <h2>Summary</h2>
            <p>{e.summary}</p>
        </section>
    {/if}

    {#if e.next_action}
        <section>
            <h2>Next action</h2>
            <p>{e.next_action}</p>
        </section>
    {/if}

    {#if e.tags.length > 0}
        <section>
            <h2>Tags</h2>
            <div class="tags">
                {#each e.tags as tag (tag)}
                    <span class="chip">#{tag}</span>
                {/each}
            </div>
        </section>
    {/if}

    {#if e.original_audio_url}
        <section>
            <h2>Audio</h2>
            <audio controls src={e.original_audio_url}></audio>
            <p style="margin-top: 8px; font-size: 12px;">
                <a href={e.original_audio_url} target="_blank" rel="noopener">Open file</a>
            </p>
        </section>
    {/if}

    <section>
        <h2>Transcript</h2>
        <pre>{e.transcript}</pre>
    </section>
</div>
