<script lang="ts">
    import { page } from '$app/state'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const reports = $derived(data.reports)
    const justGenerated = $derived(page.url.searchParams.get('generated') === '1')

    let copiedId = $state<string | null>(null)

    function formatDate(iso: string): string {
        const d = new Date(iso)
        return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    }

    // The exact input the model received — labeled so it can be pasted into
    // another model (Opus, GPT-5, …) for an honest side-by-side comparison.
    function buildPromptText(systemPrompt: string, userContent: string): string {
        return `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER CONTENT ===\n${userContent}`
    }

    async function copyPrompt(id: string, systemPrompt: string, userContent: string): Promise<void> {
        try {
            await navigator.clipboard.writeText(buildPromptText(systemPrompt, userContent))
            copiedId = id
            setTimeout(() => {
                if (copiedId === id) {
                    copiedId = null
                }
            }, 2000)
        } catch {
            copiedId = null
        }
    }

    // Minimal markdown rendering — `## headings`, **bold**, * bullets, numbered lists.
    function renderMarkdown(text: string): string {
        const lines = text.split('\n')
        const out: string[] = []
        let inList: 'ul' | 'ol' | null = null

        function escape(s: string): string {
            return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }
        function inline(s: string): string {
            return escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        }
        function closeList(): void {
            if (inList === 'ul') out.push('</ul>')
            if (inList === 'ol') out.push('</ol>')
            inList = null
        }

        for (const raw of lines) {
            const line = raw.trim()
            if (line.length === 0) {
                closeList()
                continue
            }
            if (line.startsWith('## ')) {
                closeList()
                out.push(`<h3>${inline(line.slice(3))}</h3>`)
            } else if (line.startsWith('# ')) {
                closeList()
                out.push(`<h2>${inline(line.slice(2))}</h2>`)
            } else if (/^[-*]\s+/.test(line)) {
                if (inList !== 'ul') {
                    closeList()
                    out.push('<ul>')
                    inList = 'ul'
                }
                out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
            } else if (/^\d+\.\s+/.test(line)) {
                if (inList !== 'ol') {
                    closeList()
                    out.push('<ol>')
                    inList = 'ol'
                }
                out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`)
            } else {
                closeList()
                out.push(`<p>${inline(line)}</p>`)
            }
        }
        closeList()
        return out.join('\n')
    }
</script>

<div class="today-head">
    <div>
        <h1>Стратегия</h1>
        <p class="muted" style="font-size: 12px; margin: 4px 0 0;">
            AI смотрит на твой профиль, резюме, последние 60 записей и состояние спринта. Затем пишет честный разбор:
            фокус на 30 дней, что в архив, риск.
        </p>
    </div>
    <form method="POST" action="?/generate">
        <button type="submit" class="btn-primary"
            >{reports.length > 0 ? 'Сгенерировать ещё разбор' : 'AI: дай разбор'}</button
        >
    </form>
</div>

{#if justGenerated}
    <p class="reasoning">Готово. Свежий разбор сверху.</p>
{/if}
{#if form?.error}
    <p class="error">{form.error}</p>
{/if}

{#if reports.length === 0}
    <div class="empty">
        <p>
            Пусто. Нажми <strong>AI: дай разбор</strong>. AI прочитает контекст и напишет 30-дневную стратегию с
            фокусом, открытыми петлями и микро-победами на эту неделю.
        </p>
    </div>
{:else}
    {#each reports as r, i (r.id)}
        <article class="card strategy-card">
            <header class="strategy-head">
                <span class="muted">{formatDate(r.created_at)} · модель: {r.model}{i === 0 ? ' · свежий' : ''}</span>
                <form
                    method="POST"
                    action="?/delete"
                    onsubmit={(ev) => {
                        if (!confirm('Удалить этот разбор?')) ev.preventDefault()
                    }}
                >
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" class="link-button">удалить</button>
                </form>
            </header>
            <div class="strategy-body">
                <!-- AI-generated content from server, escaped in renderMarkdown — XSS risk is acceptable. -->
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(r.body)}
            </div>
            {#if r.system_prompt || r.user_content}
                <details class="strategy-input">
                    <summary>
                        <span>Что видел AI</span>
                        <button
                            type="button"
                            class="link-button"
                            onclick={(ev) => {
                                ev.preventDefault()
                                copyPrompt(r.id, r.system_prompt, r.user_content)
                            }}
                        >
                            {copiedId === r.id ? 'скопировано ✓' : 'копировать промпт'}
                        </button>
                    </summary>
                    <p class="muted strategy-input-hint">
                        Точный вход модели. Скопируй и вставь в Opus / GPT-5, чтобы сравнить разбор на одном и том же
                        контексте.
                    </p>
                    <h4>System prompt</h4>
                    <pre class="strategy-input-pre">{r.system_prompt}</pre>
                    <h4>User content</h4>
                    <pre class="strategy-input-pre">{r.user_content}</pre>
                </details>
            {/if}
        </article>
    {/each}
{/if}
