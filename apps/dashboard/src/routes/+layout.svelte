<script lang="ts">
    import './styles.css'

    import { page } from '$app/state'
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'

    const { children } = $props()
    const isLogin = $derived(page.url.pathname === '/login')

    const navItems = [
        { href: '/', label: 'Journal' },
        { href: '/inbox', label: 'Inbox' },
        { href: '/strategy', label: 'Strategy' },
        { href: '/inbox?priority=archive', label: 'Archive' },
        { href: '/profile', label: 'Profile' },
    ]

    function isActive(href: string): boolean {
        if (href === '/') {
            return page.url.pathname === '/'
        }
        if (href.includes('priority=archive')) {
            return page.url.pathname === '/inbox' && page.url.searchParams.get('priority') === 'archive'
        }
        if (href === '/inbox') {
            return page.url.pathname === '/inbox' && page.url.searchParams.get('priority') !== 'archive'
        }
        return page.url.pathname.startsWith(href)
    }
</script>

<div class="shell">
    {#if !isLogin}
        <header class="topbar">
            <a href="/" class="brand" aria-label="Orbit, journal">
                <OrbitBrand />
            </a>
            <nav aria-label="Основная навигация">
                {#each navItems as item (item.href)}
                    <a
                        href={item.href}
                        class:active={isActive(item.href)}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                        {item.label}
                    </a>
                {/each}
                <form method="POST" action="/logout" class="logout-form">
                    <button type="submit">Logout</button>
                </form>
            </nav>
        </header>
    {/if}

    <main>
        {@render children()}
    </main>

    {#if !isLogin}
        <footer class="app-footer">
            <OrbitBrand compact />
            <span>Личный контекст, собранный в одном месте.</span>
        </footer>
    {/if}
</div>
