<script lang="ts">
    import './styles.css'

    import { page } from '$app/state'

    const { children } = $props()
    const isLogin = $derived(page.url.pathname === '/login')
</script>

<div class="shell">
    {#if !isLogin}
        <header class="topbar">
            <a href="/" class="brand">🪐 Orbit</a>
            <nav>
                <a href="/">Now</a>
                <a href="/inbox">Inbox</a>
                <a href="/strategy">🧭 Strategy</a>
                <a href="/inbox?priority=archive">📦 Archive</a>
                <a href="/profile">Profile</a>
                <form method="POST" action="/logout" class="logout-form">
                    <button type="submit">Logout</button>
                </form>
            </nav>
        </header>
    {/if}

    <main>
        {@render children()}
    </main>
</div>
