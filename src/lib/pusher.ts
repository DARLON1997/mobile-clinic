/**
 * Pusher — Mises à jour en temps réel
 * Usages : statut agent terrain, notifications Admin
 */

import Pusher from "pusher"

export const pusherServer = new Pusher({
  appId:   process.env.PUSHER_APP_ID!,
  key:     process.env.PUSHER_KEY!,
  secret:  process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? "eu",
  useTLS:  true,
})

// ─── Définition des canaux & événements ──────────────────────────────────────

/**
 * Canal mission agent terrain.
 * channel: `mission-${missionId}`
 * events:
 *   - "status-update"   : { status: MissionStatus, updatedAt: string }
 *   - "location-update" : { lat: number, lng: number }
 */
export function missionChannel(missionId: string) {
  return `private-mission-${missionId}`
}

/**
 * Canal notifications Admin.
 * channel: "admin-notifications"
 * events:
 *   - "new-approval-request" : { appointmentId, patientName, doctorName }
 *   - "payment-received"     : { appointmentId, amount, txRef }
 */
export const ADMIN_CHANNEL = "private-admin-notifications"

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
  event: "new-approval-request" | "payment-received" | "new-appointment" | "appointment-approved" | "presentiel-alerte",
  payload: object
) {
  await pusherServer.trigger(ADMIN_CHANNEL, event, payload)
}

// ─── Canaux Pharmacie ─────────────────────────────────────────────────────────

/**
 * Canal pharmacie partenaire.
 * channel: `pharmacie-${pharmacieId}`
 * events:
 *   - "new-commande"      : { commandeId, montantTotal, typeLivraison }
 *   - "stock-alert"       : { medicamentId, nomMedicament, quantiteStock }
 *   - "payment-received"  : { commandeId, montantTotal }
 */
export function pharmacieChannel(pharmacieId: string) {
  return `private-pharmacie-${pharmacieId}`
}

/**
 * Canal call-center-inbox (partagé).
 * Ajoute l'event new-ordonnance-request.
 */
export const CALL_CENTER_INBOX_CHANNEL = "private-call-center-inbox"

/**
 * Canal patient (notifications pharmacie).
 * channel: `patient-${patientId}`
 * events:
 *   - "ordonnance-processed" : { ordonnanceId, status }
 *   - "commande-status"      : { commandeId, status }
 *   - "medicament-found"     : { ordonnanceId }
 */
export function patientChannel(patientId: string) {
  return `private-patient-${patientId}`
}

export async function triggerPharmacieNotification(
  pharmacieId: string,
  event: "new-commande" | "stock-alert" | "payment-received",
  payload: object
) {
  await pusherServer.trigger(pharmacieChannel(pharmacieId), event, payload)
}

export async function triggerCallCenterOrdonnance(payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, "new-ordonnance-request", payload)
}

export async function triggerCallCenterPresentiel(payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, "presentiel-alerte", payload)
}

export async function triggerPatientNotification(
  patientId: string,
  event:
    | "ordonnance-processed"
    | "commande-status"
    | "medicament-found"
    | "appointment-approved-instant"
    | "ordonnance-photo-envoyee"
    | "appointment-status-changed"
    | "presentiel-status-changed"
    | "notification-bell-update",
  payload: object
) {
  await pusherServer.trigger(patientChannel(patientId), event, payload)
}

export function doctorChannel(doctorId: string) {
  return `private-doctor-${doctorId}`
}

export async function triggerDoctorNotification(
  doctorId: string,
  event:
    | "appointment-status-changed"
    | "presentiel-status-changed"
    | "consultation-active-changed"
    | "notification-bell-update",
  payload: object
) {
  await pusherServer.trigger(doctorChannel(doctorId), event, payload)
}

export async function triggerCallCenterStatusChange(event: string, payload: object) {
  await pusherServer.trigger(CALL_CENTER_INBOX_CHANNEL, event, payload)
}
