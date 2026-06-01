<script lang="ts">
    import type { DailyPlan, Entry } from '@orbit/shared'

    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji } from '$lib/format'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const today = $derived(data.today)
    const tomorrow = $derived(data.tomorrow)
    const parentTitles = $derived(data.parentTitles)

    function open(entries: Entry[]): Entry[] {
        return entries.filter((e) => !e.done_at)
    }
    function done(entries: Entry[]): Entry[] {
        return entries.filter((e) => e.done_at)
    }
    function reasoningFor(target: string, plan: DailyPlan | null): string {
        if (form?.target === target && form?.reasoning) {
            return form.reasoning
        }
        return plan?.reasoning ?? ''
    }
</script>

<div class="today-head">
    <h1>План</h1>
    <div class="generate-buttons">
        <form method="POST" action="?/generate">
            <input type="hidden" name="target" value="today" />
            <button type="submit" class="btn-primary">
                {today.entries.length > 0 ? 'Догенерировать на сегодня' : 'Сгенерировать на сегодня'}
            </button>
        </form>
        <form method="POST" action="?/generate">
            <input type="hidden" name="target" value="tomorrow" />
            <button type="submit" class="btn-secondary">
                {tomorrow.entries.length > 0 ? 'Догенерировать на завтра' : 'На завтра'}
            </button>
        </form>
    </div>
</div>

{#if form?.error}
    <p class="error">{form.error}</p>
{/if}

<section class="plan-day">
    <h2 class="plan-day-title">Сегодня · <span class="muted">{today.date}</span></h2>

    {#if reasoningFor('today', today.plan)}
        <p class="reasoning">{reasoningFor('today', today.plan)}</p>
    {/if}

    {#if today.entries.length === 0}
        <div class="empty">
            <p>
                Пусто. Нажми <strong>Сгенерировать на сегодня</strong> или возьми задачу из <a href="/week">недели</a>.
            </p>
        </div>
    {:else}
        {#if open(today.entries).length > 0}
            <section class="plan-section">
                <h3>Делать</h3>
                {#each open(today.entries) as entry (entry.id)}
                    <article class="card today-card">
                        <div class="today-row">
                            <form method="POST" action="?/done" class="done-form">
                                <input type="hidden" name="id" value={entry.id} />
                                <input type="hidden" name="done" value="1" />
                                <button type="submit" class="done-toggle" aria-label="Mark done">○</button>
                            </form>
                            <div class="today-body">
                                {#if entry.parent_id && parentTitles[entry.parent_id]}
                                    <a href="/entries/{entry.parent_id}" class="parent-chip"
                                        >↑ {parentTitles[entry.parent_id]}</a
                                    >
                                {/if}
                                <a href="/entries/{entry.id}" class="today-title">
                                    {categoryEmoji(entry.category)}
                                    {entry.title}
                                </a>
                                {#if entry.next_action}
                                    <p class="next-action">{entry.next_action}</p>
                                {/if}
                                {#if today.plan?.explanations[entry.id]}
                                    <p class="task-why">Почему сегодня: {today.plan.explanations[entry.id]}</p>
                                {/if}
                                <EntryEdit {entry} redirectTo="/today" />
                            </div>
                        </div>
                    </article>
                {/each}
            </section>
        {/if}

        {#if done(today.entries).length > 0}
            <section class="plan-section">
                <h3>Сделано</h3>
                {#each done(today.entries) as entry (entry.id)}
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
</section>

{#if tomorrow.entries.length > 0 || reasoningFor('tomorrow', tomorrow.plan)}
    <section class="plan-day">
        <h2 class="plan-day-title">Завтра · <span class="muted">{tomorrow.date}</span></h2>

        {#if reasoningFor('tomorrow', tomorrow.plan)}
            <p class="reasoning">{reasoningFor('tomorrow', tomorrow.plan)}</p>
        {/if}

        {#if tomorrow.entries.length > 0}
            <section class="plan-section">
                {#each tomorrow.entries as entry (entry.id)}
                    <article class="card today-card">
                        <div class="today-row">
                            <span class="done-toggle preview" aria-hidden="true">·</span>
                            <div class="today-body">
                                {#if entry.parent_id && parentTitles[entry.parent_id]}
                                    <a href="/entries/{entry.parent_id}" class="parent-chip"
                                        >↑ {parentTitles[entry.parent_id]}</a
                                    >
                                {/if}
                                <a href="/entries/{entry.id}" class="today-title">
                                    {categoryEmoji(entry.category)}
                                    {entry.title}
                                </a>
                                {#if entry.next_action}
                                    <p class="next-action">{entry.next_action}</p>
                                {/if}
                                {#if tomorrow.plan?.explanations[entry.id]}
                                    <p class="task-why">Почему завтра: {tomorrow.plan.explanations[entry.id]}</p>
                                {/if}
                                <EntryEdit {entry} redirectTo="/today" />
                            </div>
                        </div>
                    </article>
                {/each}
            </section>
        {/if}
    </section>
{/if}
