<script lang="ts">
    const {
        id,
        placeholder,
        autocomplete,
        minlength,
    }: {
        id: string
        placeholder: string
        autocomplete: 'current-password' | 'new-password'
        minlength?: number
    } = $props()

    let visible = $state(false)
</script>

<div class="relative mb-1">
    <!-- `type` can be dynamic here because the value is never two-way bound —
         the form posts it natively, so Svelte's binding restriction doesn't apply. -->
    <input
        {id}
        {placeholder}
        {autocomplete}
        {minlength}
        name="password"
        type={visible ? 'text' : 'password'}
        class="pr-11"
        required
    />
    <button
        type="button"
        onclick={() => (visible = !visible)}
        aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
        aria-pressed={visible}
        class="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-field border-0 bg-transparent text-muted transition-colors duration-150 hover:text-accent-hover"
    >
        <svg
            class="h-4.5 w-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <path d="M2.1 12.3a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 19.8 0 1 1 0 0 1 0 .7 10.8 10.8 0 0 1-19.8 0" />
            <circle cx="12" cy="12" r="3" />
            {#if visible}
                <line x1="3.5" y1="3.5" x2="20.5" y2="20.5" />
            {/if}
        </svg>
    </button>
</div>
