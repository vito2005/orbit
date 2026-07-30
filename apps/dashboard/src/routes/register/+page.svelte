<script lang="ts">
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'
    import { btnPrimary, calloutError, calloutReasoning } from '$lib/ui'

    import type { ActionData } from './$types'

    const { form }: { form: ActionData } = $props()
</script>

<div
    class="mx-auto mt-[max(8vh,50px)] w-[min(100%,440px)] rounded-3xl border border-border bg-surface/90 p-7 shadow-[0_28px_80px_rgba(72,53,31,0.14)]"
>
    <div class="mb-8.5 w-fit"><OrbitBrand /></div>
    <h1 class="mb-1.75 font-serif text-[33px] font-medium tracking-[-0.03em]">Создать аккаунт</h1>
    <p class="mb-7 text-text-2">Свой журнал, стратегия и план недели.</p>
    {#if form?.sent}
        <div class={calloutReasoning}>
            Письмо с подтверждением отправлено на <strong>{form.email}</strong>. Открой ссылку из письма, чтобы войти.
        </div>
    {:else}
        {#if form?.error}
            <div class={calloutError}>{form.error}</div>
        {/if}
        <form method="POST" class="grid gap-2.25">
            <label for="register-email" class="text-xs font-semibold text-text-2">Email</label>
            <input
                id="register-email"
                class="mb-1"
                type="email"
                name="email"
                value={form?.email ?? ''}
                placeholder="you@example.com"
                autocomplete="email"
                required
            />
            <label for="register-password" class="text-xs font-semibold text-text-2">Пароль</label>
            <input
                id="register-password"
                class="mb-1"
                type="password"
                name="password"
                placeholder="Минимум 6 символов"
                autocomplete="new-password"
                minlength="6"
                required
            />
            <button type="submit" class="{btnPrimary} min-h-11 w-full">Зарегистрироваться</button>
        </form>
    {/if}
    <p class="mt-5 text-center text-[13px] text-text-2">
        Уже есть аккаунт? <a href="/login">Войти</a>
    </p>
</div>
