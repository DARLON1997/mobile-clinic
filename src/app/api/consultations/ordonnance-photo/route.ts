import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/cloudinary"
import { triggerPatientNotification } from "@/lib/pusher"

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
    console.log(`[ORD] R1 check apptId=${appointmentId} doctorId=${session.user.id}`)
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId, doctorId: session.user.id, adminApprovedAt: { not: null } },
      select: { id: true, patientId: true },
    })
    if (!appt) {
      console.log(`[ORD] R1 FAILED apptId=${appointmentId}`)
      return NextResponse.json({ error: "Accès refusé (R1)." }, { status: 403 })
    }
    console.log(`[ORD] R1 OK patientId=${appt.patientId}`)

    // Lire le corps binaire
    const buffer = Buffer.from(await req.arrayBuffer())
    console.log(`[ORD] buffer=${buffer.length} bytes`)

    if (buffer.length === 0) {
      return NextResponse.json({ error: "Image vide reçue." }, { status: 400 })
    }
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Image trop volumineuse (4 Mo max)." }, { status: 413 })
    }

    // Upload Cloudinary
    console.log(`[ORD] uploading to Cloudinary...`)
    let url: string
    try {
      const result = await uploadFile(buffer, "ordonnances", `ordonnance-${appointmentId}`)
      url = result.url
      console.log(`[ORD] Cloudinary OK url=${url}`)
    } catch (uploadErr) {
      const msg = (uploadErr as { message?: string })?.message ?? String(uploadErr)
      console.error(`[ORD] Cloudinary FAILED: ${msg}`)
      return NextResponse.json({ error: `Échec stockage image: ${msg}` }, { status: 500 })
    }

    // Sauvegarde en base
    console.log(`[ORD] upserting consultation...`)
    const now = new Date()
    const consultation = await prisma.consultation.upsert({
      where:  { appointmentId },
      create: { appointmentId, ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
      update: { ordonnancePhotoUrl: url, ordonnanceEnvoyeeAt: now },
    })
    console.log(`[ORD] consultation upserted id=${consultation.id}`)

    // Notifications (non-bloquantes)
    triggerPatientNotification(appt.patientId, "ordonnance-photo-envoyee", {
      appointmentId, ordonnancePhotoUrl: url,
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
    const msg = (err as { message?: string })?.message ?? String(err)
    console.error(`[ORD] UNHANDLED ERROR: ${msg}`)
    return NextResponse.json({ error: `Erreur serveur: ${msg}` }, { status: 500 })
  }
}
