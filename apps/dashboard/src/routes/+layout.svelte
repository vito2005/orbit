<script lang="ts">
    import './styles.css'

    import { page } from '$app/state'

    const { children } = $props()
    const isLogin = $derived(page.url.pathname === '/login')

    const path = $derived(page.url.pathname)
    const isArchive = $derived(page.url.searchParams.get('priority') === 'archive')
    const inboxActive = $derived(path.startsWith('/inbox') && !isArchive)
    const strategyActive = $derived(path.startsWith('/strategy'))
    const profileActive = $derived(path.startsWith('/profile'))
</script>

<div class="shell">
    {#if !isLogin}
        <header class="topbar">
            <a href="/" class="brand" class:active={path === '/'}>
                <span class="brand-mark">🪐</span> Orbit
            </a>
            <nav>
                <a href="/inbox" class:active={inboxActive}>Inbox</a>
                <a href="/strategy" class:active={strategyActive}>🧭 Strategy</a>
                <a href="/inbox?priority=archive" class:active={isArchive}>📦 Archive</a>
                <a href="/profile" class:active={profileActive}>Profile</a>
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
