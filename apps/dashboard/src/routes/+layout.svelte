<script lang="ts">
    import './styles.css'

    import { page } from '$app/state'
    import PwaPushTest from '$lib/components/PwaPushTest.svelte'
    import { formatNumber, NORTH_STARS, progressPct } from '$lib/northStars'

    const { children } = $props()
    const isLogin = $derived(page.url.pathname === '/login')
</script>

<div class="shell">
    {#if !isLogin}
        <header class="topbar">
            <a href="/" class="brand">🪐 Orbit</a>
            <nav>
                <a href="/today">Today</a>
                <a href="/week">Week</a>
                <a href="/inbox">Inbox</a>
                <a href="/inbox?priority=archive">📦 Archive</a>
                <PwaPushTest />
                <form method="POST" action="/logout" class="logout-form">
                    <button type="submit">Logout</button>
                </form>
            </nav>
        </header>

        <div class="north-stars">
            {#each NORTH_STARS as star (star.label)}
                <div class="north-star" class:primary={star.primary}>
                    <div class="north-star-label">
                        <span>{star.label}</span>
                        <span class="muted">
                            {formatNumber(star.current)} / {formatNumber(star.target)}
                            {star.unit}
                        </span>
                    </div>
                    <div class="north-star-bar">
                        <div class="north-star-fill" style="width: {progressPct(star)}%"></div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <main>
        {@render children()}
    </main>
</div>
