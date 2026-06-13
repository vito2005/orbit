<script lang="ts">
    const { compact = false }: { compact?: boolean } = $props()
</script>

<span class="inline-flex items-center text-inherit {compact ? 'gap-0' : 'gap-2'}">
    <svg class="shrink-0 {compact ? 'h-7 w-7' : 'h-9.5 w-9.5'}" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
            d="M11 37 C 16 24, 25 16, 33 13"
            stroke="currentColor"
            stroke-width="2.6"
            stroke-linecap="round"
            stroke-dasharray="0.2 6.2"
        />
        <circle cx="11" cy="37" r="3.4" fill="currentColor" />
        <path
            class="fill-accent"
            d="M35 5 L37.4 11.4 L43.8 13.8 L37.4 16.2 L35 22.6 L32.6 16.2 L26.2 13.8 L32.6 11.4 Z"
        />
    </svg>
    {#if !compact}
        <span class="pb-0.5 font-serif text-[27px] font-medium italic leading-[1.1] tracking-[-0.035em]">orbit</span>
    {/if}
</span>
