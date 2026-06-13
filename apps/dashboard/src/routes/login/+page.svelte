<script lang="ts">
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'

    import type { ActionData } from './$types'

    const { form }: { form: ActionData } = $props()
</script>

<div class="login">
    <div class="login-brand"><OrbitBrand /></div>
    <h1>Вернуться в журнал</h1>
    <p>Твои заметки, решения и следующий шаг.</p>
    {#if form?.error}
        <div class="error">{form.error}</div>
    {/if}
    <form method="POST">
        <label for="dashboard-password">Пароль</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input
            id="dashboard-password"
            type="password"
            name="password"
            placeholder="Dashboard password"
            autocomplete="current-password"
            autofocus
        />
        <button type="submit">Войти</button>
    </form>
</div>
