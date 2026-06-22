import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { v2 as cloudinary } from "cloudinary"
import { triggerPatientNotification } from "@/lib/pusher"
import { logServerError } from "@/lib/error-logger"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
})

// GET — génère une signature pour que le navigateur uploade directement vers Cloudinary
export async function GET(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const appointmentId = searchParams.get("appointmentId")
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId requis." }, { status: 400 })
  }

  // R1 : vérifier approbation admin
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
    select: { id: true },
  })
  if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

  const timestamp = Math.round(Date.now() / 1000)
  const folder    = "mobile-clinic/ordonnances"
  const publicId  = `ordonnance-${appointmentId}`

  const paramsToSign = { folder, public_id: publicId, timestamp }
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  )

  return NextResponse.json({
    signature,
    timestamp,
    apiKey:    process.env.CLOUDINARY_API_KEY!,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    folder,
    publicId,
  })
}

// POST — enregistre l'URL après upload direct + notifie le patient
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const body = await req.json() as { appointmentId?: string; url?: string }
    const { appointmentId, url } = body

    if (!appointmentId || !url) {
      return NextResponse.json({ error: "appointmentId et url requis." }, { status: 400 })
    }
    if (!url.includes("cloudinary.com")) {
      return NextResponse.json({ error: "URL invalide." }, { status: 400 })
    }

    // R1
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true, patientId: true },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

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
    logServerError("ORDONNANCE_PHOTO_SAVE", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
