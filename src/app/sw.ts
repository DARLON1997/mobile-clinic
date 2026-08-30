import { defaultCache } from "@serwist/next/worker"
import { NetworkOnly, Serwist } from "serwist"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

// Routes API sensibles ou temps-réel : jamais cachées
// (RDV, consultations, données patient, traçabilité CDR, chat)
const networkOnlyRoutes: RegExp[] = [
  /^\/api\/(appointments|presentiel|consultations|examens-prescrits)/,
  /^\/api\/(admin|call-center|doctor|patient|agent)/,
  /^\/api\/(notifications|chat|nursing-cares|home-visits|lab-exams)/,
  /^\/api\/(elderly-cares|referrals|pharmacies|approvals)/,
]

const customRuntimeCaching = [
  ...networkOnlyRoutes.map((matcher) => ({
    matcher,
    handler: new NetworkOnly(),
  })),
  ...defaultCache,
]

const serwist = new Serwist({
  precacheEntries:  self.__SW_MANIFEST,
  skipWaiting:      true,
  clientsClaim:     true,
  navigationPreload: true,
  runtimeCaching:   customRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()

// ─── Notifications push (audit H3) ──────────────────────────────────────────
// Complète les événements install/activate/fetch de Serwist ci-dessus —
// n'interfère pas avec le cache : ces événements ne touchent jamais le réseau.

type PushPayload = { title: string; body: string; url: string }

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return
  let payload: PushPayload
  try {
    payload = event.data.json()
  } catch {
    return
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa/icon-192x192.png",
      badge: "/pwa/icon-192x192.png",
      data: { url: payload.url },
    })
  )
})

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})
