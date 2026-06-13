<script lang="ts">
    // The visible icon is driven entirely by the `dark:` variant (which keys off
    // [data-theme] on <html>), so there's no reactive state to keep in sync and
    // no SSR/hydration mismatch — the click only flips the attribute.
    function toggleTheme(): void {
        const root = document.documentElement
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
        root.dataset.theme = next
        try {
            localStorage.setItem('orbit-theme', next)
        } catch {
            // ignore — private mode etc.; the in-memory toggle still works
        }
    }
</script>

<button
    type="button"
    onclick={toggleTheme}
    aria-label="Переключить тему"
    class="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-field text-text-2 transition-colors hover:bg-surface/50 hover:text-text active:translate-y-px"
>
    <svg class="dark:hidden" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20 14.2A8 8 0 0 1 9.8 4 7 7 0 1 0 20 14.2Z" />
    </svg>
    <svg
        class="hidden dark:block"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        aria-hidden="true"
    >
        <circle cx="12" cy="12" r="4.2" />
        <path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4"
        />
    </svg>
</button>
