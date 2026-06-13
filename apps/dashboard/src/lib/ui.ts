// Tailwind utility-string recipes for repeated UI pieces. Centralised so the
// same look stays in sync across pages without semantic CSS classes. Tailwind
// scans these string literals, so every class name resolves at build time.

const btnBase =
    'inline-flex min-h-9.5 items-center justify-center rounded-field border px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap cursor-pointer transition duration-150 active:translate-y-px'

export const btnPrimary = `${btnBase} border-accent bg-accent text-[#fffaf3] hover:border-accent-hover hover:bg-accent-hover`

export const btnSecondary = `${btnBase} border-border-strong bg-surface text-text-2 hover:border-muted hover:bg-paper hover:text-text`

export const btnDanger = `${btnBase} border-danger/30 bg-transparent text-danger hover:border-danger/50 hover:bg-danger-soft`

const cardActionBase =
    'inline-flex min-h-7.75 items-center justify-center rounded-field border px-2.5 py-1.25 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition duration-150 active:translate-y-px'

export const cardAction = `${cardActionBase} border-border-strong bg-surface text-text-2 hover:border-muted hover:bg-paper hover:text-text`

export const cardActionDanger = `${cardActionBase} border-danger/30 bg-transparent text-danger hover:border-danger/50 hover:bg-danger-soft`

export const linkButton =
    'cursor-pointer border-0 bg-transparent px-0 py-0.5 text-xs text-text-2 underline underline-offset-[3px] hover:text-accent-hover'

export const chip =
    'inline-flex min-h-6.25 items-center rounded-full border border-border bg-surface-2 px-2.25 py-0.75 text-[11px] font-medium text-text-2'

export const card =
    "relative mb-3 overflow-hidden rounded-card border border-border bg-surface/88 p-4.5 shadow-soft transition duration-[160ms] before:absolute before:inset-y-0 before:left-0 before:w-0.75 before:bg-transparent before:transition-[background] before:duration-[160ms] before:content-[''] hover:-translate-y-px hover:border-border-strong hover:shadow-card hover:before:bg-accent md:px-5.5 md:py-5"

export const hubList = 'm-0 list-none overflow-hidden rounded-card border border-border bg-surface/82 p-0 shadow-soft'

export const hubRow =
    'grid min-h-13.5 grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-b border-border px-3.5 py-2.5 transition-[background] duration-150 last:border-b-0 hover:bg-paper'

export const hubTitle = 'min-w-0 truncate font-serif text-base font-medium hover:text-accent-hover hover:no-underline'

export const emptyBox =
    'grid min-h-55 place-items-center rounded-card border border-dashed border-border-strong bg-paper/50 px-6 py-10.5 text-center text-text-2'

const calloutBase = 'mb-4.5 rounded-field border border-l-[3px] px-3.5 py-2.75 text-[13px] leading-[1.55]'

export const calloutReasoning = `${calloutBase} border-border-strong border-l-accent bg-accent-soft text-text-2`

export const calloutError = `${calloutBase} border-danger/35 border-l-danger bg-danger-soft text-danger`

export const calloutNeeds = `${calloutBase} border-warn/30 border-l-warn bg-warn-soft text-text-2`
