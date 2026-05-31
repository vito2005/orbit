<script lang="ts">
    type PushState = 'idle' | 'unsupported' | 'denied' | 'working' | 'active' | 'error'

    let state = $state<PushState>('idle')

    function publicKeyToBytes(publicKey: string) {
        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4)
        const base64 = `${publicKey}${padding}`.replaceAll('-', '+').replaceAll('_', '/')
        const raw = window.atob(base64)
        const bytes = new Uint8Array(raw.length)

        for (let index = 0; index < raw.length; index += 1) {
            bytes[index] = raw.charCodeAt(index)
        }

        return bytes
    }

    async function startPushTest() {
        state = 'working'

        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                state = 'unsupported'
                return
            }

            const permission = await Notification.requestPermission()

            if (permission !== 'granted') {
                state = permission === 'denied' ? 'denied' : 'idle'
                return
            }

            const registration = await navigator.serviceWorker.register('/sw.js')
            const response = await fetch('/api/push/public-key')
            const { publicKey }: { publicKey: string } = await response.json()

            const existing = await registration.pushManager.getSubscription()
            await existing?.unsubscribe()

            const subscription = await registration.pushManager.subscribe({
                applicationServerKey: publicKeyToBytes(publicKey),
                userVisibleOnly: true,
            })

            await fetch('/api/push/subscribe', {
                body: JSON.stringify(subscription),
                headers: {
                    'content-type': 'application/json',
                },
                method: 'POST',
            })

            state = 'active'
        } catch {
            state = 'error'
        }
    }
</script>

<button
    class="push-test-button"
    type="button"
    onclick={startPushTest}
    disabled={state === 'working' || state === 'active'}
>
    {#if state === 'working'}
        Push...
    {:else if state === 'active'}
        Push on
    {:else if state === 'unsupported'}
        No push
    {:else if state === 'denied'}
        Push off
    {:else if state === 'error'}
        Push error
    {:else}
        Test push
    {/if}
</button>
