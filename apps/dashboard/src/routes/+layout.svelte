<script lang="ts">
    import './styles.css'
    const { children } = $props()
</script>

<div class="shell">
    <header class="topbar">
        <a href="/" class="brand">🪐 Orbit</a>
        <nav>
            <a href="/">All</a>
            <a href="/?priority=now">🔥 Now</a>
            <a href="/?priority=this_week">📅 Week</a>
            <a href="/?priority=archive">📦 Archive</a>
            <form method="POST" action="/logout" class="logout-form">
                <button type="submit">Logout</button>
            </form>
        </nav>
    </header>
    <main>
        {@render children()}
    </main>
</div>
