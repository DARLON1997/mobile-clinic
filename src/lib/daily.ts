/**
 * Daily.co — Helper pour les salles vidéo
 * Chaque salle est créée pour un RDV précis et détruite automatiquement
 * 70 minutes après l'heure prévue.
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

/**
 * Crée une salle vidéo privée pour un RDV.
 * La salle expire automatiquement 70 min après scheduledAt.
 */
export async function createVideoRoom(appointmentId: string, scheduledAt: Date) {
  // La salle s'ouvre 5 min avant et expire 70 min après
  const notBefore = Math.floor(scheduledAt.getTime() / 1000) - 5 * 60
  const expiresAt  = Math.floor(scheduledAt.getTime() / 1000) + 70 * 60

  const roomName = `mc-rdv-${appointmentId}`

  const room = await dailyRequest("/rooms", "POST", {
    name: roomName,
    privacy: "private",
    properties: {
      nbf:       notBefore,
      exp:       expiresAt,
      max_participants: 2,
      enable_chat: false,
      enable_screenshare: false,
      lang: "fr",
      // Pas d'enregistrement automatique (confidentialité RGPD)
      enable_recording: "local",
      recordings_bucket: null,
    },
  })

  return {
    url:  (room as { url: string }).url,
    name: roomName,
    expiresAt: new Date(expiresAt * 1000),
  }
}

/**
 * Supprime une salle après la consultation.
 */
export async function deleteVideoRoom(roomName: string) {
  await dailyRequest(`/rooms/${roomName}`, "DELETE")
}

/**
 * Génère un token d'accès sécurisé pour rejoindre la salle.
 * Valide uniquement de scheduledAt-5min à scheduledAt+60min.
 */
export async function createRoomToken(
  roomName: string,
  userId: string,
  role: "owner" | "attendee",
  scheduledAt: Date
) {
  const nbf = Math.floor(scheduledAt.getTime() / 1000) - 5 * 60
  const exp = Math.floor(scheduledAt.getTime() / 1000) + 60 * 60

  const data = await dailyRequest("/meeting-tokens", "POST", {
    properties: {
      room_name:  roomName,
      user_id:    userId,
      is_owner:   role === "owner",
      nbf,
      exp,
      enable_recording: role === "owner" ? "local" : false,
    },
  })

  return data.token as string
}
