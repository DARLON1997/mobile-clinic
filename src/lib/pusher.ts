/**
 * Pusher — Mises à jour en temps réel
 * Usages : statut agent terrain, notifications Admin
 */

import Pusher from "pusher"
import PusherClient from "pusher-js"

// ─── Serveur (API routes uniquement) ─────────────────────────────────────────

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? "eu",
  useTLS:  true,
})

// ─── Client (composants React) ────────────────────────────────────────────────

export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
  }
)

// ─── Définition des canaux & événements ──────────────────────────────────────

/**
 * Canal mission agent terrain.
 * channel: `mission-${missionId}`
 * events:
 *   - "status-update"   : { status: MissionStatus, updatedAt: string }
 *   - "location-update" : { lat: number, lng: number }
 */
export function missionChannel(missionId: string) {
  return `mission-${missionId}`
}

/**
 * Canal notifications Admin.
 * channel: "admin-notifications"
 * events:
 *   - "new-approval-request" : { appointmentId, patientName, doctorName }
 *   - "payment-received"     : { appointmentId, amount, txRef }
 */
export const ADMIN_CHANNEL = "admin-notifications"

// ─── Helpers serveur ──────────────────────────────────────────────────────────

export async function triggerMissionUpdate(
  missionId: string,
  status: string
) {
  await pusherServer.trigger(missionChannel(missionId), "status-update", {
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function triggerAdminNotification(
  event: "new-approval-request" | "payment-received" | "new-appointment" | "appointment-approved",
  payload: object
) {
  await pusherServer.trigger(ADMIN_CHANNEL, event, payload)
}
