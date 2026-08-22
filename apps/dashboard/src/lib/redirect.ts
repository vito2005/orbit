// `next` / `redirectTo` arrive from the query string or a form field, so they
// are attacker-controlled: without this check `/login?next=https://evil.com`
// makes our own login flow hand the user to another site right after they type
// their password. Only same-site paths are followed — and "//evil.com" has to
// be rejected separately, because the browser treats a protocol-relative URL as
// absolute even though it starts with a slash.
export function safeRedirect(target: unknown, fallback: string): string {
    if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
        return target
    }
    return fallback
}
