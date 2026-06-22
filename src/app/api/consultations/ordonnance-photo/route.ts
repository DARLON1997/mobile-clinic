import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/cloudinary"
import { triggerPatientNotification } from "@/lib/pusher"
import { logServerError } from "@/lib/error-logger"

// POST — reçoit l'image en binaire brut (Content-Type: image/jpeg)
// appointmentId passé en query param pour éviter tout parsing multipart
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get("appointmentId")
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId requis." }, { status: 400 })
  }

  try {
    // R1 : vérifier approbation admin
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true, patientId: true },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

    // Lire le corps binaire directement (pas de FormData → pas de parsing instable)
    const buffer = Buffer.from(await req.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: "Image vide reçue." }, { status: 400 })
    }
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse (4 Mo max)." }, { status: 413 })
    }

    const { url } = await uploadFile(buffer, "ordonnances", `ordonnance-${appointmentId}`)

    const now = new Date()
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId },
      create: { appointmentId, ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
      update: { ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
    })

    triggerPatientNotification(appt.patientId, "ordonnance-photo-envoyee", {
      appointmentId,
      ordonnancePhotoUrl: url,
    }).catch(console.error)

    prisma.notification.create({
      data: {
        userId:  appt.patientId,
        type:    "ORDONNANCE_PHOTO",
        title:   "Votre ordonnance est disponible",
        message: "Votre médecin vous a envoyé une ordonnance photo. Consultez-la dans Mes ordonnances.",
      },
    }).catch(console.error)

    prisma.auditLog.create({
      data: {
        userId:     session.user.id,
        action:     "ORDONNANCE_ENVOYEE",
        targetId:   appointmentId,
        targetType: "Appointment",
        details:    { consultationId: consultation.id, url },
      },
    }).catch(console.error)

    return NextResponse.json({ success: true, url })
  } catch (err) {
    logServerError("ORDONNANCE_PHOTO", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
