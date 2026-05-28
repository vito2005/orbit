<script lang="ts">
    import type { ActionData } from './$types'
    const { form }: { form: ActionData } = $props()
</script>

<div class="login">
    <h1>🪐 Orbit</h1>
    {#if form?.error}
        <div class="error">{form.error}</div>
    {/if}
    <form method="POST">
        <!-- svelte-ignore a11y_autofocus -->
        <input
            type="password"
            name="password"
            placeholder="Dashboard password"
            autocomplete="current-password"
            autofocus
        />
        <button type="submit">Enter</button>
    </form>
</div>
