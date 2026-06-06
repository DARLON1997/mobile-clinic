import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { uploadFile } from "@/lib/cloudinary"
import { generatePrescriptionPDF, generatePrescriptionNumber, type PrescriptionData } from "@/lib/pdf-prescription"
import { z } from "zod"

const lineSchema = z.object({
  medication:   z.string().min(1),
  dosage:       z.string(),
  duration:     z.string(),
  instructions: z.string(),
})

const schema = z.object({
  appointmentId: z.string().cuid(),
  clinicalNotes: z.string().optional(),
  diagnosis:     z.string().optional(),
  lines:         z.array(lineSchema).min(1),
  followUpDate:  z.string().optional(),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "MEDECIN") {
    return NextResponse.json({ error: "Réservé aux médecins" }, { status: 403 })
  }

  try {
    const body = schema.parse(await req.json())

    // RÈGLE R1 : vérification adminApprovedAt avant toute écriture médicale
    const appointment = await prisma.appointment.findFirst({
      where: {
        id:              body.appointmentId,
        doctorId:        session.user.id,
        adminApprovedAt: { not: null },
        status:          { in: ["CONFIRMED", "IN_PROGRESS"] },
      },
      include: {
        patient: {
          select: {
            email: true,
            patientProfile: { select: { firstName: true, lastName: true, dateOfBirth: true } },
          },
        },
        doctor: {
          select: {
            doctorProfile: {
              select: { firstName: true, lastName: true, licenseNumber: true, speciality: true },
            },
          },
        },
      },
    })

    if (!appointment) {
      // RÈGLE R3 : audit tentative refusée
      await prisma.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "PRESCRIPTION_DENIED_NO_APPROVAL",
          targetId:   body.appointmentId,
          targetType: "Appointment",
        },
      })
      return NextResponse.json({ error: "RDV non autorisé ou introuvable." }, { status: 403 })
    }

    // RÈGLE R8 : transaction — Consultation + RDV + AuditLog + Notification
    const consultation = await prisma.$transaction(async (tx) => {
      const consult = await tx.consultation.create({
        data: {
          appointmentId: body.appointmentId,
          clinicalNotes: body.clinicalNotes,
          diagnosis:     body.diagnosis,
          followUpDate:  body.followUpDate ? new Date(body.followUpDate) : null,
          // prescriptionUrl mis à jour après l'upload Cloudinary
        },
      })

      await tx.appointment.update({
        where: { id: body.appointmentId },
        data:  { status: "COMPLETED" },
      })

      // RÈGLE R3 : audit obligatoire
      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "PRESCRIPTION_CREATED",
          targetId:   body.appointmentId,
          targetType: "Consultation",
          details:    { diagnosis: body.diagnosis, linesCount: body.lines.length },
        },
      })

      await tx.notification.create({
        data: {
          userId:  appointment.patientId,
          type:    "PRESCRIPTION_READY",
          title:   "Votre ordonnance est disponible",
          message: "Votre médecin a rédigé votre ordonnance. Téléchargez-la depuis votre espace.",
        },
      })

      return consult
    })

    // Génération PDF ordonnance + upload Cloudinary (hors transaction)
    let prescriptionUrl: string | null = null
    try {
      const dp = appointment.doctor.doctorProfile
      const pp = appointment.patient.patientProfile

      const prescData: PrescriptionData = {
        prescriptionNumber: generatePrescriptionNumber(),
        consultationDate:   appointment.scheduledAt,
        doctor: {
          firstName:     dp?.firstName     ?? "",
          lastName:      dp?.lastName      ?? "",
          licenseNumber: dp?.licenseNumber ?? "",
          speciality:    dp?.speciality    ?? "",
        },
        patient: {
          firstName:   pp?.firstName   ?? "Patient",
          lastName:    pp?.lastName    ?? "",
          dateOfBirth: pp?.dateOfBirth ?? new Date(),
        },
        diagnosis:     body.diagnosis,
        clinicalNotes: body.clinicalNotes,
        items:         body.lines,
        followUpDate:  body.followUpDate ? new Date(body.followUpDate) : null,
      }

      const pdfBuffer = await generatePrescriptionPDF(prescData)
      const publicId  = `prescription-${consultation.id}-${Date.now()}`
      const upload    = await uploadFile(pdfBuffer, "prescriptions", publicId)
      prescriptionUrl = upload.url

      // Mettre à jour l'URL du PDF dans la consultation
      await prisma.consultation.update({
        where: { id: consultation.id },
        data:  { prescriptionUrl },
      })
    } catch (pdfErr) {
      // PDF non bloquant — la consultation est créée, on logue l'erreur
      console.error("[prescriptions PDF/upload]", pdfErr)
    }

    // Email patient avec lien PDF (non bloquant)
    if (appointment.patient.email) {
      sendEmail(
        appointment.patient.email,
        "Votre ordonnance est disponible — Mobile Clinic",
        emailTemplates.prescriptionReady(
          appointment.patient.patientProfile?.firstName ?? "Patient",
          prescriptionUrl ?? `${process.env.NEXTAUTH_URL}/patient/prescriptions`
        )
      ).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      data: { ...consultation, prescriptionUrl },
    })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides" }, { status: 400 })
    console.error("[prescriptions POST]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
