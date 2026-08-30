/**
 * Notifications push (Web Push / VAPID) — audit H3.
 * Complète Pusher (temps réel, app ouverte) pour le cas où l'app est fermée :
 * chaque helper `triggerXxx` de src/lib/pusher.ts appelle aussi ces fonctions.
 */
import webpush from "web-push"
import { prisma } from "@/lib/prisma"
import { logServerError } from "@/lib/error-logger"
import type { Role } from "@prisma/client"

const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject    = process.env.VAPID_SUBJECT ?? "mailto:contact@mobile-clinic.cg"

const isConfigured = Boolean(vapidPublicKey && vapidPrivateKey)

if (isConfigured) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!)
}

export type PushPayload = {
  title: string
  body: string
  url:  string // page ouverte au clic sur la notification
}

async function deliver(userId: string, payload: PushPayload) {
  if (!isConfigured) return // clés VAPID absentes (dev local sans .env) — silencieux

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Abonnement expiré ou révoqué côté navigateur — on le retire.
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
        } else {
          logServerError("PUSH_SEND", err)
        }
      }
    })
  )
}

/** Envoie une notification push à un utilisateur précis. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  await deliver(userId, payload)
}

/** Envoie à tous les utilisateurs actifs d'un rôle (Admin, Call Center — équivalent des canaux Pusher partagés). */
export async function sendPushToRole(role: Role, payload: PushPayload) {
  if (!isConfigured) return
  const users = await prisma.user.findMany({ where: { role, isActive: true }, select: { id: true } })
  await Promise.all(users.map((u) => deliver(u.id, payload)))
}

/** Envoie au compte utilisateur rattaché à une pharmacie (pharmacieId ≠ userId). */
export async function sendPushToPharmacie(pharmacieId: string, payload: PushPayload) {
  if (!isConfigured) return
  const profile = await prisma.pharmacieProfile.findUnique({
    where:  { id: pharmacieId },
    select: { userId: true },
  })
  if (profile) await deliver(profile.userId, payload)
}
