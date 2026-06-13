<script lang="ts">
    import { page } from '$app/state'
    import { btnPrimary, calloutError, calloutReasoning, emptyBox, linkButton } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const reports = $derived(data.reports)
    const justGenerated = $derived(page.url.searchParams.get('generated') === '1')

    let copiedId = $state<string | null>(null)

    // Strategy reports never use the hover lift, but keep the rest of the card look.
    const cardStatic =
        "relative mb-3 overflow-hidden rounded-card border border-border bg-surface/88 p-5 shadow-soft transition duration-[160ms] before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:bg-transparent before:transition-[background] before:duration-[160ms] before:content-[''] hover:border-border-strong hover:shadow-card hover:before:bg-accent md:px-7.5 md:py-6.5"

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

<div class="mb-6 flex flex-wrap items-start justify-between gap-4.5">
    <div class="max-w-165">
        <h1 class="m-0 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Стратегия
        </h1>
        <p class="mt-1 text-xs text-muted">
            AI смотрит на твой профиль, резюме, последние 60 записей и состояние спринта. Затем пишет честный разбор:
            фокус на 30 дней, что в архив, риск.
        </p>
    </div>
    <form method="POST" action="?/generate">
        <button type="submit" class={btnPrimary}>
            {reports.length > 0 ? 'Сгенерировать ещё разбор' : 'AI: дай разбор'}
        </button>
    </form>
</div>

{#if justGenerated}
    <p class={calloutReasoning}>Готово. Свежий разбор сверху.</p>
{/if}
{#if form?.error}
    <p class={calloutError}>{form.error}</p>
{/if}

{#if reports.length === 0}
    <div class={emptyBox}>
        <p class="m-0 max-w-[44ch]">
            Пусто. Нажми <strong>AI: дай разбор</strong>. AI прочитает контекст и напишет 30-дневную стратегию с
            фокусом, открытыми петлями и микро-победами на эту неделю.
        </p>
    </div>
{:else}
    {#each reports as r, i (r.id)}
        <article class={cardStatic}>
            <header class="mb-4.5 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                <span class="font-mono tabular-nums text-muted"
                    >{formatDate(r.created_at)} · модель: {r.model}{i === 0 ? ' · свежий' : ''}</span
                >
                <form
                    method="POST"
                    action="?/delete"
                    onsubmit={(ev) => {
                        if (!confirm('Удалить этот разбор?')) ev.preventDefault()
                    }}
                >
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" class={linkButton}>удалить</button>
                </form>
            </header>
            <div class="strategy-prose">
                <!-- AI-generated content from server, escaped in renderMarkdown — XSS risk is acceptable. -->
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(r.body)}
            </div>
            {#if r.system_prompt || r.user_content}
                <details class="mt-5.5 border-t border-border pt-3.5">
                    <summary
                        class="flex cursor-pointer list-none items-center justify-between gap-3 text-text-2 [&::-webkit-details-marker]:hidden"
                    >
                        <span class="before:text-accent before:content-['+_'] [details[open]_&]:before:content-['−_']">
                            Что видел AI
                        </span>
                        <button
                            type="button"
                            class={linkButton}
                            onclick={(ev) => {
                                ev.preventDefault()
                                copyPrompt(r.id, r.system_prompt, r.user_content)
                            }}
                        >
                            {copiedId === r.id ? 'скопировано ✓' : 'копировать промпт'}
                        </button>
                    </summary>
                    <p class="mt-2 text-[13px] text-muted">
                        Точный вход модели. Скопируй и вставь в Opus / GPT-5, чтобы сравнить разбор на одном и том же
                        контексте.
                    </p>
                    <h4 class="mt-4.5 mb-1.75 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                        System prompt
                    </h4>
                    <pre
                        class="m-0 max-h-85 overflow-auto rounded-field border border-border bg-paper p-3.5 font-mono text-[11px] leading-[1.6] wrap-break-word whitespace-pre-wrap text-text-2">{r.system_prompt}</pre>
                    <h4 class="mt-4.5 mb-1.75 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                        User content
                    </h4>
                    <pre
                        class="m-0 max-h-85 overflow-auto rounded-field border border-border bg-paper p-3.5 font-mono text-[11px] leading-[1.6] wrap-break-word whitespace-pre-wrap text-text-2">{r.user_content}</pre>
                </details>
            {/if}
        </article>
    {/each}
{/if}
