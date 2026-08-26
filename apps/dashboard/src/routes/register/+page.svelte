<script lang="ts">
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'
    import { btnPrimary } from '$lib/ui'

    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const botLink = $derived(data.botLink)
</script>

<div
    class="mx-auto mt-[max(8vh,50px)] w-[min(100%,440px)] rounded-3xl border border-border bg-surface/90 p-7 shadow-[0_28px_80px_rgba(72,53,31,0.14)]"
>
    <div class="mb-8.5 w-fit"><OrbitBrand /></div>
    <h1 class="mb-1.75 font-serif text-[33px] font-medium tracking-[-0.03em]">Аккаунт создаётся в боте</h1>
    <p class="mb-7 leading-[1.6] text-text-2">
        Напиши боту в Telegram — аккаунт появится сам, и можно сразу диктовать. Ничего заполнять не нужно.
    </p>
    {#if botLink}
        <a href={botLink} class="{btnPrimary} min-h-11 w-full no-underline hover:no-underline">Открыть бота</a>
    {/if}
    <p class="mt-5 text-center text-[13px] text-text-2">
        Уже есть аккаунт? <a href="/login">Войти</a>
    </p>
    <p class="mt-6 text-center text-[12px] text-muted">
        <a href="/privacy" class="text-muted hover:text-accent-hover">Политика конфиденциальности</a>
    </p>
</div>
