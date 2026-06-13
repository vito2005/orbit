<script lang="ts">
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'
    import { btnPrimary, calloutError } from '$lib/ui'

    import type { ActionData } from './$types'

    const { form }: { form: ActionData } = $props()
</script>

<div
    class="mx-auto mt-[max(8vh,50px)] w-[min(100%,440px)] rounded-3xl border border-border bg-surface/90 p-7 shadow-[0_28px_80px_rgba(72,53,31,0.14)]"
>
    <div class="mb-8.5 w-fit"><OrbitBrand /></div>
    <h1 class="mb-1.75 font-serif text-[33px] font-medium tracking-[-0.03em]">Вернуться в журнал</h1>
    <p class="mb-7 text-text-2">Твои заметки, решения и следующий шаг.</p>
    {#if form?.error}
        <div class={calloutError}>{form.error}</div>
    {/if}
    <form method="POST" class="grid gap-2.25">
        <label for="dashboard-password" class="text-xs font-semibold text-text-2">Пароль</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input
            id="dashboard-password"
            class="mb-1"
            type="password"
            name="password"
            placeholder="Dashboard password"
            autocomplete="current-password"
            autofocus
        />
        <button type="submit" class="{btnPrimary} min-h-11 w-full">Войти</button>
    </form>
</div>
