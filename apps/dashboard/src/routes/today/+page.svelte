<script lang="ts">
    import { categoryEmoji } from '$lib/format'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const entries = $derived(data.entries)
    const openEntries = $derived(entries.filter((e) => !e.done_at))
    const doneEntries = $derived(entries.filter((e) => e.done_at))
</script>

<div class="today-head">
    <h1>План на сегодня</h1>
    <form method="POST" action="?/generate">
        <button type="submit" class="btn-primary">{entries.length > 0 ? 'Догенерировать' : 'Сгенерировать план'}</button
        >
    </form>
</div>

{#if form?.error}
    <p class="error">{form.error}</p>
{/if}
{#if form?.reasoning}
    <p class="reasoning">{form.reasoning}</p>
{/if}

{#if openEntries.length === 0 && doneEntries.length === 0}
    <div class="empty">
        <p>
            Пусто. Нажми <strong>Сгенерировать план</strong> или зайди в <a href="/week">Неделя</a> и выбери задачи сам.
        </p>
    </div>
{:else}
    {#if openEntries.length > 0}
        <section class="plan-section">
            <h2>Делать</h2>
            {#each openEntries as entry (entry.id)}
                <article class="card today-card">
                    <div class="today-row">
                        <form method="POST" action="?/done" class="done-form">
                            <input type="hidden" name="id" value={entry.id} />
                            <input type="hidden" name="done" value="1" />
                            <button type="submit" class="done-toggle" aria-label="Mark done">○</button>
                        </form>
                        <div class="today-body">
                            <a href="/entries/{entry.id}" class="today-title">
                                {categoryEmoji(entry.category)}
                                {entry.title}
                            </a>
                            {#if entry.next_action}
                                <p class="next-action">{entry.next_action}</p>
                            {/if}
                            <div class="today-meta">
                                <span class="badge {entry.priority}">{entry.priority.replace('_', ' ')}</span>
                                <span class="muted">· {entry.category}</span>
                                <form method="POST" action="?/unschedule" class="inline-form">
                                    <input type="hidden" name="id" value={entry.id} />
                                    <button type="submit" class="link-button" aria-label="Remove from today"
                                        >убрать</button
                                    >
                                </form>
                            </div>
                        </div>
                    </div>
                </article>
            {/each}
        </section>
    {/if}

    {#if doneEntries.length > 0}
        <section class="plan-section">
            <h2>Сделано сегодня</h2>
            {#each doneEntries as entry (entry.id)}
                <article class="card today-card done">
                    <div class="today-row">
                        <form method="POST" action="?/done" class="done-form">
                            <input type="hidden" name="id" value={entry.id} />
                            <input type="hidden" name="done" value="0" />
                            <button type="submit" class="done-toggle done" aria-label="Mark undone">✓</button>
                        </form>
                        <div class="today-body">
                            <a href="/entries/{entry.id}" class="today-title done">
                                {categoryEmoji(entry.category)}
                                {entry.title}
                            </a>
                        </div>
                    </div>
                </article>
            {/each}
        </section>
    {/if}
{/if}
