<script lang="ts">
    const { compact = false }: { compact?: boolean } = $props()
</script>

<span class:compact class="orbit-brand">
    <svg class="orbit-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
            d="M11 37 C 16 24, 25 16, 33 13"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-dasharray="0.2 6.2"
        />
        <circle cx="11" cy="37" r="3.4" fill="currentColor" />
        <path
            class="orbit-star"
            d="M35 5 L37.4 11.4 L43.8 13.8 L37.4 16.2 L35 22.6 L32.6 16.2 L26.2 13.8 L32.6 11.4 Z"
        />
    </svg>
    {#if !compact}
        <span class="orbit-wordmark">orbit</span>
    {/if}
</span>
