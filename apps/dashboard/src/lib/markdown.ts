// Minimal markdown rendering for AI-generated reports — `## headings`, **bold**,
// `* / -` bullets and numbered lists. Shared by /strategy and /week. Output is
// injected via {@html}, so escape() runs on every text node first.
export function renderMarkdown(text: string): string {
    const lines = text.split('\n')
    const out: string[] = []
    let inList: 'ul' | 'ol' | null = null

    function escape(s: string): string {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
    function inline(s: string): string {
        return escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    }
    function closeList(): void {
        if (inList === 'ul') {
            out.push('</ul>')
        }
        if (inList === 'ol') {
            out.push('</ol>')
        }
        inList = null
    }

    for (const raw of lines) {
        const line = raw.trim()
        if (line.length === 0) {
            closeList()
            continue
        }
        if (line.startsWith('## ')) {
            closeList()
            out.push(`<h3>${inline(line.slice(3))}</h3>`)
        } else if (line.startsWith('# ')) {
            closeList()
            out.push(`<h2>${inline(line.slice(2))}</h2>`)
        } else if (/^[-*]\s+/.test(line)) {
            if (inList !== 'ul') {
                closeList()
                out.push('<ul>')
                inList = 'ul'
            }
            out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`)
        } else if (/^\d+\.\s+/.test(line)) {
            if (inList !== 'ol') {
                closeList()
                out.push('<ol>')
                inList = 'ol'
            }
            out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`)
        } else {
            closeList()
            out.push(`<p>${inline(line)}</p>`)
        }
    }
    closeList()
    return out.join('\n')
}
