import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { formatDateFR } from "@/lib/utils"
import { sendSMS } from "@/lib/africas-talking"
import { sendEmail } from "@/lib/mailer"
import { revalidatePath } from "next/cache"
import { triggerPatientNotification, triggerDoctorNotification, triggerCallCenterStatusChange } from "@/lib/pusher"

const approveSchema = z.object({
  presentielId: z.string().cuid(),
  decision:     z.enum(["APPROVE", "REJECT"]),
  adminNote:    z.string().optional(),
})

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "20"))
  const status = searchParams.get("status")

  const where: Record<string, unknown> = {}
  if (status && status !== "ALL") where.status = status

  const [total, presentiels] = await Promise.all([
    prisma.rendezVousPresentiel.count({ where }),
    prisma.rendezVousPresentiel.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            phone: true,
            email: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: {
            id: true,
            email: true,
            phone: true,
            doctorProfile: { select: { firstName: true, lastName: true, speciality: true } },
          },
        },
        cabinet: true,
      },
      orderBy: { scheduledAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ success: true, data: presentiels, meta: { total, page, limit } })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  try {
    const { presentielId, decision, adminNote } = approveSchema.parse(await req.json())

    const presentiel = await prisma.rendezVousPresentiel.findUnique({
      where: { id: presentielId },
      include: {
        patient: {
          select: {
            id: true,
            email: true,
            phone: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: {
            id: true,
            email: true,
            phone: true,
            doctorProfile: { select: { firstName: true, lastName: true } },
          },
        },
        cabinet: true,
      },
    })

    if (!presentiel) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 })
    }
    if (presentiel.status === "CONFIRME" || presentiel.status === "ANNULE") {
      return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 })
    }

    const patientName = presentiel.patient.patientProfile
      ? `${presentiel.patient.patientProfile.firstName} ${presentiel.patient.patientProfile.lastName}`
      : "Patient"
    const doctorName = presentiel.doctor.doctorProfile
      ? `Dr ${presentiel.doctor.doctorProfile.firstName} ${presentiel.doctor.doctorProfile.lastName}`
      : "Médecin"
    const dateStr = formatDateFR(presentiel.scheduledAt)
    const mergedNotes = adminNote
      ? [presentiel.notes, adminNote].filter(Boolean).join(" — ")
      : presentiel.notes

    if (decision === "APPROVE") {
      const updated = await prisma.$transaction(async (tx) => {
        const data = {
          status: "CONFIRME" as const,
          notes: mergedNotes,
        }
        const confirmed = await tx.rendezVousPresentiel.update({ where: { id: presentielId }, data })

        await tx.auditLog.create({
          data: {
            userId:     session.user.id,
            action:     "PRESENTIEL_CONFIRMED",
            targetId:   presentielId,
            targetType: "RendezVousPresentiel",
            details:    { patientId: presentiel.patientId, doctorId: presentiel.doctorId },
          },
        })

        await tx.notification.create({
          data: {
            userId:  presentiel.patientId,
            type:    "PRESENTIEL_CONFIRMED",
            title:   "Consultation présentielle confirmée",
            message: `Votre consultation présentielle avec ${doctorName} le ${dateStr} est confirmée.`,
          },
        })

        await tx.notification.create({
          data: {
            userId:  presentiel.doctorId,
            type:    "PRESENTIEL_CONFIRMED",
            title:   "Consultation présentielle confirmée",
            message: `La consultation présentielle avec ${patientName} le ${dateStr} est confirmée.`,
          },
        })

        return confirmed
      })

      if (presentiel.patient.phone) {
        sendSMS(
          presentiel.patient.phone,
          `Bonjour ${patientName}, votre consultation présentielle avec ${doctorName} est confirmée pour le ${dateStr}.`
        ).catch(console.error)
      }
      if (presentiel.patient.email) {
        sendEmail(
          presentiel.patient.email,
          "Votre consultation présentielle est confirmée — Mobile Clinic",
          `<p>Bonjour ${patientName},</p><p>Votre consultation en présentiel avec ${doctorName} le ${dateStr} est confirmée.</p><p>Merci de vous présenter au cabinet à l'heure.</p>`
        ).catch(console.error)
      }

      triggerPatientNotification(presentiel.patientId, "presentiel-status-changed", {
        presentielId, status: "CONFIRME",
      }).catch(console.error)
      triggerDoctorNotification(presentiel.doctorId, "presentiel-status-changed", {
        presentielId, status: "CONFIRME",
      }).catch(console.error)
      triggerCallCenterStatusChange("presentiel-status-changed", {
        presentielId, status: "CONFIRME",
      }).catch(console.error)

      revalidatePath("/admin/presentiel")
      revalidatePath("/call-center/appointments")
      revalidatePath("/patient/presentiel")
      revalidatePath("/doctor/presentiel")

      return NextResponse.json({ success: true, data: updated })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.rendezVousPresentiel.update({
        where: { id: presentielId },
        data: {
          status: "ANNULE" as const,
          notes: mergedNotes,
        },
      })

      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "PRESENTIEL_REJECTED",
          targetId:   presentielId,
          targetType: "RendezVousPresentiel",
          details:    { reason: adminNote, patientId: presentiel.patientId, doctorId: presentiel.doctorId },
        },
      })

      await tx.notification.create({
        data: {
          userId:  presentiel.patientId,
          type:    "PRESENTIEL_REJECTED",
          title:   "Consultation présentielle refusée",
          message: adminNote
            ? `Votre demande a été refusée : ${adminNote}`
            : "Votre demande de consultation présentielle n'a pas pu être acceptée.",
        },
      })

      return cancelled
    })

    if (presentiel.patient.phone) {
      sendSMS(
        presentiel.patient.phone,
        `Bonjour ${patientName}, votre demande de consultation présentielle du ${dateStr} a été refusée.${adminNote ? ` Raison : ${adminNote}` : ""}`
      ).catch(console.error)
    }

    triggerPatientNotification(presentiel.patientId, "presentiel-status-changed", {
      presentielId, status: "ANNULE",
    }).catch(console.error)
    triggerCallCenterStatusChange("presentiel-status-changed", {
      presentielId, status: "ANNULE",
    }).catch(console.error)

    revalidatePath("/admin/presentiel")
    revalidatePath("/call-center/appointments")
    revalidatePath("/patient/presentiel")

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[presentiel admin POST]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
