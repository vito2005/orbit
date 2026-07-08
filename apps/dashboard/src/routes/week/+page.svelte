<script lang="ts">
    import { page } from '$app/state'
    import { renderMarkdown } from '$lib/markdown'
    import { btnPrimary, calloutError, calloutReasoning, emptyBox, linkButton } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const plans = $derived(data.plans)
    const justGenerated = $derived(page.url.searchParams.get('generated') === '1')

    let copiedId = $state<string | null>(null)

    // Same static card look as /strategy — no hover lift on a report.
    const cardStatic =
        "relative mb-3 overflow-hidden rounded-card border border-border bg-surface/88 p-5 shadow-soft transition duration-[160ms] before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:bg-transparent before:transition-[background] before:duration-[160ms] before:content-[''] hover:border-border-strong hover:shadow-card hover:before:bg-accent md:px-7.5 md:py-6.5"

    function formatDate(iso: string): string {
        const d = new Date(iso)
        return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    }

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
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4.5">
    <div class="max-w-165">
        <h1 class="m-0 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            Неделя
        </h1>
        <p class="mt-1 text-xs text-muted">
            AI берёт фокус из последней стратегии, твой бюджет времени и реальный бэклог — и пишет 3-5 конкретных задач
            на текущую неделю, под размер дня.
        </p>
    </div>
    <form method="POST" action="?/generate">
        <button type="submit" class={btnPrimary}>
            {plans.length > 0 ? 'Обновить план недели' : 'AI: план на неделю'}
        </button>
    </form>
</div>

{#if justGenerated}
    <p class={calloutReasoning}>Готово. Свежий план сверху.</p>
{/if}
{#if !data.hasStrategy}
    <p class={calloutReasoning}>
        Стратегии пока нет — план опирается на north stars и бэклог. Для точного фокуса сначала
        <a href="/strategy">сгенерируй разбор</a>.
    </p>
{/if}
{#if form?.error}
    <p class={calloutError}>{form.error}</p>
{/if}

{#if plans.length === 0}
    <div class={emptyBox}>
        <p class="m-0 max-w-[44ch]">
            Пусто. Нажми <strong>AI: план на неделю</strong>. AI прочитает стратегию и бэклог и предложит небольшой
            честный набор задач на эту неделю.
        </p>
    </div>
{:else}
    {#each plans as p, i (p.id)}
        <article class={cardStatic}>
            <header class="mb-4.5 flex items-baseline justify-between gap-3 border-b border-border pb-3">
                <span class="font-mono tabular-nums text-muted"
                    >{formatDate(p.created_at)} · модель: {p.model}{i === 0 ? ' · свежий' : ''}</span
                >
                <form
                    method="POST"
                    action="?/delete"
                    onsubmit={(ev) => {
                        if (!confirm('Удалить этот план?')) ev.preventDefault()
                    }}
                >
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" class={linkButton}>удалить</button>
                </form>
            </header>
            <div class="strategy-prose">
                <!-- AI-generated content from server, escaped in renderMarkdown — XSS risk is acceptable. -->
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html renderMarkdown(p.body)}
            </div>
            {#if p.system_prompt || p.user_content}
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
                                copyPrompt(p.id, p.system_prompt, p.user_content)
                            }}
                        >
                            {copiedId === p.id ? 'скопировано ✓' : 'копировать промпт'}
                        </button>
                    </summary>
                    <p class="mt-2 text-[13px] text-muted">
                        Точный вход модели. Скопируй и вставь в Opus / GPT-5, чтобы сравнить план на одном и том же
                        контексте.
                    </p>
                    <h4 class="mt-4.5 mb-1.75 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                        System prompt
                    </h4>
                    <pre
                        class="m-0 max-h-85 overflow-auto rounded-field border border-border bg-paper p-3.5 font-mono text-[11px] leading-[1.6] wrap-break-word whitespace-pre-wrap text-text-2">{p.system_prompt}</pre>
                    <h4 class="mt-4.5 mb-1.75 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
                        User content
                    </h4>
                    <pre
                        class="m-0 max-h-85 overflow-auto rounded-field border border-border bg-paper p-3.5 font-mono text-[11px] leading-[1.6] wrap-break-word whitespace-pre-wrap text-text-2">{p.user_content}</pre>
                </details>
            {/if}
        </article>
    {/each}
{/if}
