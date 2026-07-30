<script lang="ts">
    import '../app.css'

    import { page } from '$app/state'
    import OrbitBrand from '$lib/components/OrbitBrand.svelte'
    import ThemeToggle from '$lib/components/ThemeToggle.svelte'

    import type { LayoutData } from './$types'

    const { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props()
    const isAuthPage = $derived(page.url.pathname === '/login' || page.url.pathname === '/register')

    const navItems = [
        { href: '/', label: 'Journal' },
        { href: '/inbox', label: 'Inbox' },
        { href: '/strategy', label: 'Strategy' },
        { href: '/week', label: 'Week' },
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

    const navBase =
        'inline-flex min-h-9 items-center rounded-field px-2.5 py-2 text-[13px] font-medium whitespace-nowrap transition duration-150 hover:no-underline active:translate-y-px'
</script>

<div class="mx-auto min-h-dvh w-[min(100%,1040px)] px-4 pb-10 pt-4 sm:px-7 sm:pb-[54px] sm:pt-6 md:pt-7">
    {#if !isAuthPage}
        <header
            class="mb-10.5 grid gap-3.5 border-b border-text-2/20 pb-4.5 pt-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:pb-5 sm:pt-2.5 md:mb-16"
        >
            <a href="/" class="w-fit text-text hover:no-underline" aria-label="Orbit, journal">
                <OrbitBrand />
            </a>
            <nav
                aria-label="Основная навигация"
                class="flex w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-end"
            >
                {#each navItems as item (item.href)}
                    <a
                        href={item.href}
                        aria-current={isActive(item.href) ? 'page' : undefined}
                        class="{navBase} {isActive(item.href)
                            ? 'bg-accent-soft text-accent-hover'
                            : 'text-text-2 hover:bg-surface/50 hover:text-text'}"
                    >
                        {item.label}
                    </a>
                {/each}
                {#if data.email}
                    <span class="ml-auto hidden max-w-40 truncate text-[12px] text-muted sm:inline">{data.email}</span>
                {/if}
                <form method="POST" action="/logout" class={data.email ? '' : 'ml-auto'}>
                    <button
                        type="submit"
                        class="{navBase} cursor-pointer border-0 bg-transparent text-text-2 hover:bg-surface/50 hover:text-text"
                    >
                        Logout
                    </button>
                </form>
                <ThemeToggle />
            </nav>
        </header>
    {/if}

    <main>
        {@render children()}
    </main>

    {#if !isAuthPage}
        <footer
            class="mt-16 flex items-center gap-2.5 border-t border-text-2/[0.18] pt-4.5 font-serif text-sm italic text-muted"
        >
            <OrbitBrand compact />
            <span>Личный контекст, собранный в одном месте.</span>
        </footer>
    {/if}
</div>
