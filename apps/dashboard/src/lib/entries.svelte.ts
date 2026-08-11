import type { Priority } from '@orbit/shared'

type EntryLike = { id: string; done_at: string | null; priority: Priority }

// Optimistic overlays on top of the server data: each mutation renders
// immediately and the response confirms it, so nothing re-navigates. An id
// appears here only after the user acted on it in this session; everything
// else falls through to the values that came from `load`.
const doneOverrides = $state<Record<string, string | null>>({})
const priorityOverrides = $state<Record<string, Priority>>({})
const removed = $state<Record<string, true>>({})

async function patchEntry(id: string, body: { done?: boolean; priority?: Priority }): Promise<boolean> {
    try {
        const response = await fetch(`/api/entries/${id}`, {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        return response.ok
    } catch {
        return false
    }
}

export function doneAt(entry: EntryLike): string | null {
    return entry.id in doneOverrides ? doneOverrides[entry.id] : entry.done_at
}

export function isDone(entry: EntryLike): boolean {
    return doneAt(entry) !== null
}

export async function toggleDone(entry: EntryLike): Promise<void> {
    const previous = doneAt(entry)
    // Not reactive state — the Date is read once and discarded, and the value
    // is only a placeholder until the request comes back.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const next = previous === null ? new Date().toISOString() : null
    doneOverrides[entry.id] = next

    if (!(await patchEntry(entry.id, { done: next !== null }))) {
        doneOverrides[entry.id] = previous
    }
}

export function priorityOf(entry: EntryLike): Priority {
    return entry.id in priorityOverrides ? priorityOverrides[entry.id] : entry.priority
}

export function isArchived(entry: EntryLike): boolean {
    return priorityOf(entry) === 'archive'
}

export async function toggleArchive(entry: EntryLike): Promise<void> {
    const previous = priorityOf(entry)
    const next: Priority = previous === 'archive' ? 'backlog' : 'archive'
    priorityOverrides[entry.id] = next

    if (!(await patchEntry(entry.id, { priority: next }))) {
        priorityOverrides[entry.id] = previous
    }
}

export function isRemoved(entry: EntryLike): boolean {
    return entry.id in removed
}

// Resolves to false when the delete failed, so the caller can skip navigating.
export async function removeEntry(entry: EntryLike): Promise<boolean> {
    removed[entry.id] = true
    try {
        const response = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`)
        }
        return true
    } catch {
        delete removed[entry.id]
        return false
    }
}
