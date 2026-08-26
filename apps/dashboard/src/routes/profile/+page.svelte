<script lang="ts">
    import { page } from '$app/state'
    import PasswordInput from '$lib/components/PasswordInput.svelte'
    import { btnPrimary, btnSecondary, calloutError, calloutReasoning, chip } from '$lib/ui'

    import type { ActionData, PageData } from './$types'

    const { data, form }: { data: PageData; form: ActionData } = $props()
    const catsSaved = $derived(page.url.searchParams.get('cats') === '1')
    const emailPending = $derived(page.url.searchParams.get('email_pending') === '1')
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

{#if catsSaved || emailPending}
    <p class={calloutReasoning}>
        {#if catsSaved}Категории обновлены.{/if}
        {#if emailPending}Пароль сохранён. Проверь почту — по ссылке из письма адрес подтвердится.{/if}
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
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Вход по почте</h2>
    {#if data.hasRealEmail}
        <p class="text-[13px] text-muted">
            Привязана <strong>{data.email}</strong> — можно входить почтой и паролем, не только из Telegram.
        </p>
    {:else}
        <p class="mb-3.5 max-w-[62ch] text-[13px] leading-[1.6] text-muted">
            Сейчас войти можно только из Telegram. Привяжи почту — она пригодится, если доступ к Telegram пропадёт.
        </p>
        <form method="POST" action="?/attachEmail" class="grid max-w-90 gap-2.25">
            <label for="attach-email" class="text-xs font-semibold text-text-2">Email</label>
            <input id="attach-email" class="mb-1" type="email" name="email" placeholder="you@example.com" required />
            <label for="attach-password" class="text-xs font-semibold text-text-2">Пароль</label>
            <PasswordInput
                id="attach-password"
                placeholder="Не короче 8 символов"
                autocomplete="new-password"
                minlength={8}
            />
            <button type="submit" class={btnPrimary}>Привязать</button>
        </form>
    {/if}
</section>

<section class="mb-9 pt-1">
    <h2 class="mb-3 font-serif text-[17px] font-medium italic text-text-2">Telegram-бот</h2>
    {#if data.telegramLink}
        <p class="mb-3 text-[13px] text-muted">
            Бот привязан. Отправляй голосовые и текст — они попадут в твой журнал.
        </p>
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
