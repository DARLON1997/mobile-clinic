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
