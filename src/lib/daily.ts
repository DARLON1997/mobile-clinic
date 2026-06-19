/**
 * Daily.co — Helper pour les salles vidéo
 */

const DAILY_API_URL = "https://api.daily.co/v1"

async function dailyRequest(path: string, method: "GET" | "POST" | "DELETE", body?: object) {
  const res = await fetch(`${DAILY_API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Daily.co API error ${res.status}: ${err}`)
  }

  return res.status !== 204 ? res.json() : null
}

type DailyRoom = { url: string; name: string }

/**
 * Récupère une salle existante par son nom.
 */
async function getVideoRoom(roomName: string): Promise<DailyRoom> {
  const room = await dailyRequest(`/rooms/${roomName}`, "GET")
  return { url: (room as DailyRoom).url, name: roomName }
}

/**
 * Crée une salle vidéo privée pour un RDV.
 * - Si la salle existe déjà → la récupère (idempotent)
 * - Garantit que exp est toujours dans le futur (même pour les RDV passés)
 */
export async function createVideoRoom(appointmentId: string, scheduledAt: Date): Promise<DailyRoom & { expiresAt: Date }> {
  const now         = Math.floor(Date.now() / 1000)
  const scheduledTs = Math.floor(scheduledAt.getTime() / 1000)

  // La salle s'ouvre 5 min avant le RDV (ou immédiatement si RDV passé)
  const notBefore = Math.min(scheduledTs - 5 * 60, now)
  // Expire 70 min après le RDV, mais au minimum 70 min à partir de maintenant
  const expiresAt = Math.max(scheduledTs + 70 * 60, now + 70 * 60)

  const roomName = `mc-rdv-${appointmentId}`

  let room: DailyRoom
  try {
    const created = await dailyRequest("/rooms", "POST", {
      name: roomName,
      privacy: "private",
      properties: {
        nbf:               notBefore,
        exp:               expiresAt,
        max_participants:  2,
        enable_chat:       false,
        enable_screenshare: false,
        lang:              "fr",
        enable_prejoin_ui: false,
      },
    })
    room = { url: (created as DailyRoom).url, name: roomName }
  } catch (err) {
    // Salle déjà existante → la récupérer
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes("already exists")) {
      room = await getVideoRoom(roomName)
    } else {
      throw err
    }
  }

  return { ...room, expiresAt: new Date(expiresAt * 1000) }
}

/**
 * Désactive le pré-join UI sur une salle existante (pour les salles déjà créées).
 */
export async function disablePrejoinUi(roomName: string) {
  await dailyRequest(`/rooms/${roomName}`, "POST", {
    properties: { enable_prejoin_ui: false },
  })
}

/**
 * Supprime une salle après la consultation.
 */
export async function deleteVideoRoom(roomName: string) {
  await dailyRequest(`/rooms/${roomName}`, "DELETE")
}

/**
 * Génère un token d'accès sécurisé pour rejoindre la salle.
 * Garantit que exp est dans le futur même pour les RDV passés.
 */
export async function createRoomToken(
  roomName: string,
  userId: string,
  role: "owner" | "attendee",
  scheduledAt: Date
) {
  const now         = Math.floor(Date.now() / 1000)
  const scheduledTs = Math.floor(scheduledAt.getTime() / 1000)

  const nbf = Math.min(scheduledTs - 5 * 60, now)
  const exp = Math.max(scheduledTs + 60 * 60, now + 60 * 60)

  const data = await dailyRequest("/meeting-tokens", "POST", {
    properties: {
      room_name: roomName,
      user_id:   userId,
      is_owner:  role === "owner",
      nbf,
      exp,
    },
  })

  return data.token as string
}
