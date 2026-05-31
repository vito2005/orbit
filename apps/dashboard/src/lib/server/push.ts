import { env } from '@orbit/shared'
import webPush, { type PushSubscription } from 'web-push'

type PushPayload = {
    body: string
    tag: string
    title: string
    url: string
}

let subscription: PushSubscription | null = null
let notificationOpened = false
let pushInterval: ReturnType<typeof setInterval> | null = null
let webPushConfigured = false

function hasText(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
}

function isPushSubscription(value: unknown): value is PushSubscription {
    if (typeof value !== 'object' || value === null) {
        return false
    }

    const candidate = value as {
        endpoint?: unknown
        expirationTime?: unknown
        keys?: {
            auth?: unknown
            p256dh?: unknown
        }
    }

    return hasText(candidate.endpoint) && hasText(candidate.keys?.auth) && hasText(candidate.keys?.p256dh)
}

function configureWebPush() {
    if (webPushConfigured) {
        return
    }

    if (!env.WEB_PUSH_VAPID_PUBLIC_KEY || !env.WEB_PUSH_VAPID_PRIVATE_KEY) {
        throw new Error('Missing Web Push VAPID keys')
    }

    webPush.setVapidDetails(env.WEB_PUSH_VAPID_SUBJECT, env.WEB_PUSH_VAPID_PUBLIC_KEY, env.WEB_PUSH_VAPID_PRIVATE_KEY)
    webPushConfigured = true
}

function testPayload(): PushPayload {
    return {
        body: 'Привет. Orbit push работает.',
        tag: 'orbit-test-push',
        title: 'Orbit',
        url: '/today?pwaNotificationOpened=1',
    }
}

async function sendTestPush() {
    if (!subscription || notificationOpened) {
        stopTestPushes()
        return
    }

    configureWebPush()

    try {
        await webPush.sendNotification(subscription, JSON.stringify(testPayload()))
    } catch (error) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'statusCode' in error &&
            (error.statusCode === 404 || error.statusCode === 410)
        ) {
            stopTestPushes()
        }
    }
}

export function publicVapidKey() {
    if (!env.WEB_PUSH_VAPID_PUBLIC_KEY) {
        throw new Error('Missing WEB_PUSH_VAPID_PUBLIC_KEY')
    }

    return env.WEB_PUSH_VAPID_PUBLIC_KEY
}

export function startTestPushes(value: unknown) {
    if (!isPushSubscription(value)) {
        throw new Error('Invalid push subscription')
    }

    subscription = value
    notificationOpened = false

    if (pushInterval) {
        clearInterval(pushInterval)
    }

    void sendTestPush()
    pushInterval = setInterval(() => {
        void sendTestPush()
    }, 60_000)
}

export function stopTestPushes() {
    notificationOpened = true

    if (pushInterval) {
        clearInterval(pushInterval)
        pushInterval = null
    }
}
