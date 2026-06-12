<script lang="ts">
    import { page } from '$app/state'
    import EntryEdit from '$lib/components/EntryEdit.svelte'
    import { categoryEmoji, formatDate } from '$lib/format'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const e = $derived(data.entry)
    const parent = $derived(data.parent)
    const subtasks = $derived(data.subtasks)
    const suggestions = $derived(form && 'suggestions' in form ? form.suggestions : null)
    const needsContext = $derived(form && 'needsContext' in form ? form.needsContext : null)
    const contextSaved = $derived(page.url.searchParams.get('context_saved') === '1')
    const doneSubtasks = $derived(subtasks.filter((s) => s.done_at !== null).length)
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
    {#if parent}
        <p class="parent-link">
            ↑ часть задачи: <a href="/entries/{parent.id}">{categoryEmoji(parent.category)} {parent.title}</a>
        </p>
    {/if}
    <h1>{categoryEmoji(e.category)} {e.title}</h1>
    <div class="detail-meta">
        {e.type === 'voice' ? '🎤 voice' : '📝 text'}
        &nbsp;·&nbsp; energy: {e.energy}
        {#if e.content_potential !== null}
            &nbsp;·&nbsp; potential: {e.content_potential}/10
        {/if}
        &nbsp;·&nbsp; {formatDate(e.created_at)}
    </div>
    <EntryEdit entry={e} redirectTo="/entries/{e.id}" />

    <section class="motivation-section">
        <h2>Зачем мне это</h2>
        {#if e.motivation}
            <p class="motivation-text">{e.motivation}</p>
            <div class="motivation-actions">
                <form method="POST" action="?/generateMotivation">
                    <button type="submit" class="btn-secondary">Перегенерировать</button>
                </form>
                <form method="POST" action="?/clearMotivation">
                    <button type="submit" class="link-button">очистить</button>
                </form>
            </div>
        {:else}
            <p class="muted" style="font-size: 13px; margin: 0 0 8px;">
                Пока пусто. Попроси AI связать задачу с твоими north stars и описать что ты получишь, если доведёшь до
                конца.
            </p>
            <form method="POST" action="?/generateMotivation">
                <button type="submit" class="btn-primary">AI: написать мотивацию</button>
            </form>
        {/if}
    </section>

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

    <section>
        <h2>
            Контекст / источники
            {#if e.extra_context && e.extra_context.length > 0}
                <span class="muted" style="font-weight: normal; text-transform: none; letter-spacing: 0;">
                    ({e.extra_context.length} символов)
                </span>
            {/if}
        </h2>
        <p class="muted" style="font-size: 12px; margin: 0 0 8px;">
            Программа курса, ToC книги, brief задачи, ссылки, ТЗ. AI использует это при разбивке на подзадачи и при
            мотивации.
        </p>
        {#if contextSaved}
            <p class="reasoning" style="margin-bottom: 8px;">Сохранено.</p>
        {/if}
        <form method="POST" action="?/setExtraContext" class="profile-form">
            <textarea
                name="extra_context"
                rows="8"
                placeholder="Вставь сюда: программу курса, brief задачи, ссылки, ТЗ — что угодно. AI будет использовать это."
                >{e.extra_context ?? ''}</textarea
            >
            <div class="profile-form-actions">
                <button type="submit" class="btn-secondary">Сохранить контекст</button>
            </div>
        </form>
    </section>

    <section>
        <h2>
            Подзадачи
            {#if subtasks.length > 0}
                <span class="muted" style="font-weight: normal; text-transform: none; letter-spacing: 0;">
                    ({doneSubtasks}/{subtasks.length})
                </span>
            {/if}
        </h2>

        {#if needsContext}
            <div class="needs-context">
                <p><strong>AI просит больше контекста:</strong></p>
                <p>{needsContext}</p>
                <p class="muted" style="font-size: 12px; margin: 8px 0 0;">
                    ↑ Вставь это в поле «Контекст / источники» выше, сохрани, и нажми «AI: разбить на подзадачи» ещё
                    раз.
                </p>
            </div>
        {/if}

        {#if subtasks.length > 0}
            <ul class="hub-list" style="margin-bottom: 12px;">
                {#each subtasks as st (st.id)}
                    <li class="hub-row" class:done={st.done_at !== null}>
                        <span class="hub-dot" class:done={st.done_at !== null}>{st.done_at !== null ? '✓' : '○'}</span>
                        <a href="/entries/{st.id}" class="hub-title" class:done={st.done_at !== null}>{st.title}</a>
                    </li>
                {/each}
            </ul>
        {/if}

        {#if suggestions}
            <form method="POST" action="?/createSubtasks" class="subtask-form">
                <p class="muted" style="font-size: 12px; margin: 0 0 8px;">
                    AI предложил {suggestions.length} подзадач. Сними галочки с лишних или подгенерируй ещё раз.
                </p>
                {#each suggestions as s (s.title)}
                    <label class="subtask-suggestion">
                        <input type="checkbox" name="subtask" value={JSON.stringify(s)} checked />
                        <div class="subtask-suggestion-body">
                            <div class="subtask-suggestion-title">{s.title}</div>
                            {#if s.next_action}
                                <div class="subtask-suggestion-action">↳ {s.next_action}</div>
                            {/if}
                        </div>
                    </label>
                {/each}
                <div class="subtask-form-actions">
                    <button type="submit" class="btn-primary">Создать выбранные</button>
                </div>
            </form>
        {:else}
            <form method="POST" action="?/suggestSplit">
                <button type="submit" class="btn-secondary">
                    {subtasks.length > 0 ? 'AI: предложить ещё подзадачи' : 'AI: разбить на подзадачи'}
                </button>
            </form>
            {#if form && 'error' in form && form.error}
                <p class="error" style="margin-top: 8px;">{form.error}</p>
            {/if}
        {/if}
    </section>

    {#if e.type === 'voice'}
        <section>
            <h2>Audio</h2>
            {#if e.original_audio_url}
                <audio controls src={e.original_audio_url}></audio>
                <p style="margin-top: 8px; font-size: 12px;">
                    <a href={e.original_audio_url} target="_blank" rel="noopener">Open file</a>
                </p>
            {:else}
                <p class="muted" style="font-size: 13px; margin: 0;">
                    Аудио-файл не сохранился (либо bucket не public, либо загрузка упала). Опирайся на транскрипт ниже.
                </p>
            {/if}
        </section>
    {/if}

    <section>
        <h2>Transcript</h2>
        <pre>{e.transcript}</pre>
    </section>
</div>
