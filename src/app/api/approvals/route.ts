import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS, smsTemplates } from "@/lib/africas-talking"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { createVideoRoom } from "@/lib/daily"
import { triggerAdminNotification, triggerPatientNotification, triggerDoctorNotification, triggerCallCenterStatusChange } from "@/lib/pusher"
import { formatDateFR, formatXAF } from "@/lib/utils"
import { FEATURES } from "@/lib/features"
import { revalidatePath } from "next/cache"

const approveSchema = z.object({
  appointmentId: z.string().cuid(),
  decision:      z.enum(["APPROVE", "REJECT"]),
  adminNote:     z.string().optional(),
})

const submitSchema = z.object({
  appointmentId: z.string().cuid(),
  notes:         z.string().optional(),
})

// GET — Liste des demandes en attente (SUPER_ADMIN)
export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  const pending = await prisma.appointment.findMany({
    where:   { status: "AWAITING_APPROVAL" },
    include: {
      patient: {
        select: {
          id: true, email: true, phone: true,
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
      doctor: {
        select: {
          id: true, email: true,
          doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } },
        },
      },
    },
    orderBy: [{ isInstant: "desc" }, { createdAt: "asc" }],
  })

  return NextResponse.json({ success: true, data: pending })
}

// PUT — Soumettre un RDV à l'Admin (CALL_CENTER_AGENT)
export async function PUT(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "CALL_CENTER_AGENT") {
    return NextResponse.json({ error: "Réservé au Call Center" }, { status: 403 })
  }

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { id: true, isActive: true },
  })
  if (!dbUser) return NextResponse.json({ error: "Compte introuvable — veuillez vous reconnecter" }, { status: 401 })
  if (!dbUser.isActive) return NextResponse.json({ error: "Compte suspendu" }, { status: 403 })

  try {
    const { appointmentId, notes } = submitSchema.parse(await req.json())

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    })
    if (!appointment) {
      return NextResponse.json({ error: "RDV non trouvé" }, { status: 404 })
    }
    if (appointment.status !== "PENDING") {
      return NextResponse.json({ error: "Ce RDV ne peut pas être soumis (statut invalide)." }, { status: 409 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.update({
        where: { id: appointmentId },
        data:  { status: "AWAITING_APPROVAL", notes, callCenterId: session.user.id },
      })

      // Notification Admin
      await tx.notification.create({
        data: {
          userId:  session.user.id, // pour l'historique du CC
          type:    "SUBMITTED_TO_ADMIN",
          title:   "RDV soumis à l'Admin",
          message: `Le RDV #${appointmentId.slice(0, 8)} a été soumis pour autorisation.`,
        },
      })

      return appt
    })

    // Pusher temps réel Admin
    triggerAdminNotification("new-approval-request", {
      appointmentId,
      patientId: appointment.patientId,
      doctorId:  appointment.doctorId,
    }).catch(console.error)

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[approvals PUT]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}

// POST — Approuver ou refuser un RDV (SUPER_ADMIN)
export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  try {
    const contentType = req.headers.get("content-type") ?? ""
    const rawBody = contentType.includes("application/json")
      ? await req.json()
      : Object.fromEntries(await req.formData())

    const { appointmentId, decision, adminNote } = approveSchema.parse(rawBody)

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            email: true, phone: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: {
            email: true, phone: true,
            doctorProfile: { select: { firstName: true, lastName: true, consultationFee: true } },
          },
        },
      },
    })

    if (!appointment) return NextResponse.json({ error: "RDV non trouvé" }, { status: 404 })

    const patientName = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`
      : "Patient"
    const doctorName = appointment.doctor.doctorProfile
      ? `Dr ${appointment.doctor.doctorProfile.firstName} ${appointment.doctor.doctorProfile.lastName}`
      : "Médecin"
    const dateStr = formatDateFR(appointment.scheduledAt)

    // ── APPROVE ───────────────────────────────────────────────────────────────
    if (decision === "APPROVE") {
      // Créer salle Daily.co si pas encore créée et clé API configurée
      let videoRoomName: string | null = null
      let videoRoomUrl:  string | null = null
      if (!appointment.videoRoomName && process.env.DAILY_API_KEY) {
        try {
          const room = await createVideoRoom(appointmentId, appointment.scheduledAt)
          videoRoomName = room.name
          videoRoomUrl  = room.url
        } catch (dailyErr) {
          // Non-bloquant : l'approbation continue même si Daily.co échoue
          console.error("[approvals] Daily.co room creation failed:", dailyErr)
        }
      }

      // RÈGLE R8 : transaction atomique
      const newStatus = FEATURES.PAYMENT_ENABLED ? "PAYMENT_PENDING" : "CONFIRMED"
      const patientMsg = FEATURES.PAYMENT_ENABLED
        ? `Votre consultation avec ${doctorName} le ${dateStr} est approuvée. Procédez au paiement pour confirmer.`
        : `Votre consultation avec ${doctorName} le ${dateStr} est confirmée. Rejoignez la salle vidéo à l'heure prévue.`

      const updated = await prisma.$transaction(async (tx) => {
        const appt = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status:          newStatus,
            adminApprovedAt: new Date(),           // RÈGLE R1 : timestamp explicite
            adminApprovedBy: session.user.id,
            adminNote:       adminNote ?? null,
            videoRoomName:   videoRoomName ?? undefined,
            videoRoomUrl:    videoRoomUrl  ?? undefined,
          },
        })

        // Paiement fictif si module désactivé (maintient l'intégrité relationnelle)
        if (!FEATURES.PAYMENT_ENABLED) {
          await tx.payment.create({
            data: {
              userId:        appointment.patientId,
              appointmentId: appointmentId,
              amount:        0,
              currency:      "XAF",
              method:        "GRATUIT_LANCEMENT",
              status:        "PAID",
              flwRef:        `FREE-LAUNCH-${Date.now()}`,
            },
          })
        }

        // RÈGLE R3 : audit APPROVE
        await tx.auditLog.create({
          data: {
            userId:     session.user.id,
            action:     "APPOINTMENT_APPROVED",
            targetId:   appointmentId,
            targetType: "Appointment",
            details:    { patientId: appointment.patientId, doctorId: appointment.doctorId },
          },
        })

        // Notification patient
        await tx.notification.create({
          data: {
            userId:  appointment.patientId,
            type:    "APPOINTMENT_APPROVED",
            title:   "RDV approuvé ✅",
            message: patientMsg,
          },
        })

        // Notification médecin
        await tx.notification.create({
          data: {
            userId:  appointment.doctorId,
            type:    "APPOINTMENT_APPROVED",
            title:   "Nouveau RDV approuvé",
            message: `Nouveau RDV avec ${patientName} le ${dateStr}.`,
          },
        })

        return appt
      })

      // SMS + Email patient (non bloquants)
      const fee = appointment.doctor.doctorProfile?.consultationFee ?? 0
      if (appointment.patient.phone) {
        sendSMS(appointment.patient.phone,
          smsTemplates.appointmentConfirmed(patientName, dateStr, doctorName)).catch(console.error)
      }
      if (appointment.patient.email) {
        sendEmail(
          appointment.patient.email,
          "Votre rendez-vous est confirmé — Mobile Clinic",
          emailTemplates.appointmentConfirmed(patientName, dateStr, doctorName, formatXAF(fee))
        ).catch(console.error)
      }

      // SMS médecin
      if (appointment.doctor.phone) {
        sendSMS(
          appointment.doctor.phone,
          `Mobile Clinic : Nouveau RDV approuvé le ${dateStr} avec le patient ${patientName}.`
        ).catch(console.error)
      }

      triggerAdminNotification("appointment-approved", { appointmentId }).catch(console.error)

      // Notifier le patient en temps réel si consultation instantanée
      // → il sera redirigé automatiquement sans avoir à rafraîchir
      if (appointment.isInstant) {
        triggerPatientNotification(appointment.patientId, "appointment-approved-instant", {
          appointmentId,
          status: updated.status,
        }).catch(console.error)
      }

      // Invalidation temps réel : patient + médecin + call-center voient le changement
      triggerPatientNotification(appointment.patientId, "appointment-status-changed", {
        appointmentId, status: updated.status,
      }).catch(console.error)
      triggerDoctorNotification(appointment.doctorId, "appointment-status-changed", {
        appointmentId, status: updated.status,
      }).catch(console.error)
      triggerCallCenterStatusChange("appointment-status-changed", {
        appointmentId, status: updated.status,
      }).catch(console.error)

      revalidatePath("/admin/approvals")
      revalidatePath("/call-center/appointments")
      revalidatePath("/patient/appointments")
      revalidatePath("/doctor/appointments")

      return NextResponse.json({ success: true, data: updated })
    }

    // ── REJECT ────────────────────────────────────────────────────────────────
    const updated = await prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status:    "REJECTED",
          adminNote: adminNote ?? null,
          // adminApprovedAt reste NULL → médecin bloqué
        },
      })

      // RÈGLE R3 : audit REJECT
      await tx.auditLog.create({
        data: {
          userId:     session.user.id,
          action:     "APPOINTMENT_REJECTED",
          targetId:   appointmentId,
          targetType: "Appointment",
          details:    { reason: adminNote },
        },
      })

      await tx.notification.create({
        data: {
          userId:  appointment.patientId,
          type:    "APPOINTMENT_REJECTED",
          title:   "RDV refusé",
          message: adminNote
            ? `Votre demande a été refusée : ${adminNote}`
            : "Votre demande de RDV n'a pas pu être acceptée. Contactez le Call Center.",
        },
      })

      return appt
    })

    if (appointment.patient.phone) {
      sendSMS(appointment.patient.phone,
        smsTemplates.appointmentRejected(patientName, adminNote)).catch(console.error)
    }

    triggerPatientNotification(appointment.patientId, "appointment-status-changed", {
      appointmentId, status: "REJECTED",
    }).catch(console.error)
    triggerCallCenterStatusChange("appointment-status-changed", {
      appointmentId, status: "REJECTED",
    }).catch(console.error)

    revalidatePath("/admin/approvals")
    revalidatePath("/call-center/appointments")
    revalidatePath("/patient/appointments")

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    console.error("[approvals POST]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
