self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
    const fallback = {
        body: 'Привет. Orbit push работает.',
        tag: 'orbit-test-push',
        title: 'Orbit',
        url: '/today?pwaNotificationOpened=1',
    }
    const payload = event.data ? event.data.json() : fallback

    event.waitUntil(
        self.registration.showNotification(payload.title ?? fallback.title, {
            body: payload.body ?? fallback.body,
            data: {
                url: payload.url ?? fallback.url,
            },
            tag: payload.tag ?? fallback.tag,
        }),
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url ?? '/today?pwaNotificationOpened=1'

    event.waitUntil(
        fetch('/api/push/stop', { method: 'POST' }).finally(async () => {
            const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })

            for (const client of clients) {
                client.postMessage({ type: 'orbit-test-notification-opened' })

                if ('focus' in client) {
                    return client.focus()
                }
            }

            if (self.clients.openWindow) {
                return self.clients.openWindow(url)
            }

            return undefined
        }),
    )
})
