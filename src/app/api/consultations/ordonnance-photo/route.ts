import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/cloudinary"
import { triggerPatientNotification } from "@/lib/pusher"
import { logServerError } from "@/lib/error-logger"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get("file") as File | null
    const appointmentId = formData.get("appointmentId") as string | null

    if (!file || !appointmentId) {
      return NextResponse.json({ error: "Fichier et appointmentId requis." }, { status: 400 })
    }

    // R1 : vérifier approbation admin
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true, patientId: true },
    })
    if (!appt) return NextResponse.json({ error: "Accès refusé." }, { status: 403 })

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Format non supporté (JPEG/PNG/WEBP uniquement)." }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (5 MB max)." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await uploadFile(buffer, "ordonnances", `ordonnance-${appointmentId}`)

    const now = new Date()
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId },
      create: { appointmentId, ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
      update: { ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
    })

    // Notifier le patient
    triggerPatientNotification(appt.patientId, "ordonnance-photo-envoyee", {
      appointmentId,
      ordonnancePhotoUrl: url,
    }).catch(console.error)

    // Notification interne patient
    prisma.notification.create({
      data: {
        userId:  appt.patientId,
        type:    "ORDONNANCE_PHOTO",
        title:   "Votre ordonnance est disponible",
        message: "Votre médecin vous a envoyé une ordonnance photo. Consultez-la dans vos rendez-vous.",
      },
    }).catch(console.error)

    // AuditLog
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
