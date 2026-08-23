<script lang="ts">
    import { page } from '$app/state'
    import { btnPrimary, btnSecondary, calloutError, calloutReasoning, chip } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const catsSaved = $derived(page.url.searchParams.get('cats') === '1')
    const tgUnlinked = $derived(page.url.searchParams.get('tg_unlinked') === '1')
    const lastUpdated = $derived(formatDate(data.profile.updated_at))

    const tgCode = $derived(page.url.searchParams.get('tg_code'))
    const tgLink = $derived(tgCode && data.botUsername ? `https://t.me/${data.botUsername}?start=${tgCode}` : null)

    function formatDate(iso: string): string {
        const d = new Date(iso)
        return d.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' })
    }
</script>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4.5">
    <h1 class="m-0 font-serif text-[clamp(2rem,8vw,2.8rem)] font-medium leading-[1.02] tracking-[-0.035em]">Профиль</h1>
    <span class="text-muted">обновлён {lastUpdated}</span>
</div>

<p class="mb-3.5 text-[13px] text-muted">Свободный текст о себе. Сейчас нигде не используется — см. ROADMAP.</p>

{#if tgUnlinked || catsSaved}
    <p class={calloutReasoning}>
        {#if tgUnlinked}Telegram отвязан.{/if}
        {#if catsSaved}Категории обновлены.{/if}
    </p>
{/if}
{#if form?.error}
    <p class={calloutError}>{form.error}</p>
{/if}

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">
        Категории ({data.profile.categories.length})
    </h2>
    <p class="mb-3 text-[13px] text-muted">
        По ним AI раскладывает каждую запись. Называй так, как думаешь о своей жизни — модель читает сами названия,
        отдельных правил под них нет. Удаление не трогает уже разложенные записи: они сохранят прежнюю категорию.
    </p>
    <div class="mb-3 flex flex-wrap gap-1.5">
        {#each data.profile.categories as c (c)}
            <form method="POST" action="?/removeCategory" class="{chip} gap-1.5">
                <input type="hidden" name="category" value={c} />
                {c}
                <button
                    type="submit"
                    aria-label="Удалить категорию {c}"
                    class="cursor-pointer border-0 bg-transparent p-0 text-base leading-none text-muted hover:text-danger"
                >
                    ×
                </button>
            </form>
        {/each}
    </div>
    <form method="POST" action="?/addCategory" class="flex flex-wrap items-center gap-2.5">
        <input type="text" name="category" placeholder="Новая категория" maxlength="24" class="w-auto" required />
        <button type="submit" class={btnSecondary}>Добавить</button>
    </form>
</section>

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Telegram-бот</h2>
    {#if data.telegramLink}
        <p class="mb-3 text-[13px] text-muted">
            Бот привязан. Отправляй голосовые и текст — они попадут в твой журнал.
        </p>
        <form
            method="POST"
            action="?/unlinkTelegram"
            onsubmit={(ev) => {
                if (!confirm('Отвязать Telegram от этого аккаунта?')) ev.preventDefault()
            }}
        >
            <button type="submit" class={btnSecondary}>Отвязать</button>
        </form>
    {:else if tgLink}
        <p class="mb-3 text-[13px] text-muted">
            Открой ссылку в Telegram и нажми Start — это привяжет бота к твоему аккаунту. Ссылка одноразовая.
        </p>
        <a href={tgLink} class={btnPrimary} target="_blank" rel="noopener">Открыть бота в Telegram</a>
    {:else if data.botUsername}
        <p class="mb-3 text-[13px] text-muted">Привяжи Telegram-бота, чтобы захватывать мысли голосом.</p>
        <form method="POST" action="?/connectTelegram">
            <button type="submit" class={btnPrimary}>Подключить Telegram</button>
        </form>
    {:else}
        <p class="text-[13px] text-muted">Имя бота не настроено (TELEGRAM_BOT_USERNAME) — привязка недоступна.</p>
    {/if}
</section>

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Забрать свои данные</h2>
    <p class="mb-3 text-[13px] text-muted">
        Выгружаются все записи целиком — с полными транскриптами, а не только заголовками и кратким пересказом. Markdown
        с промптом можно сразу вставить в любую AI-модель и попросить разобрать.
    </p>
    <div class="flex flex-wrap items-center gap-2.5">
        <a href="/api/export?format=md&prompt=1" class={btnPrimary}>Markdown с промптом</a>
        <a href="/api/export?format=md" class={btnSecondary}>Markdown</a>
        <a href="/api/export?format=json" class={btnSecondary}>JSON</a>
    </div>
</section>
