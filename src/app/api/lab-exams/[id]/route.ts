import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { sendSMS } from "@/lib/africas-talking"

const assignSchema = z.object({ agentId: z.string().cuid() })

const agentUpdateSchema = z.object({
  status:         z.enum(["SAMPLE_COLLECTED"]),
  samplePhotoUrl: z.string().url().optional(),
  agentNotes:     z.string().optional(),
})

const resultsSchema = z.object({
  resultFileUrl: z.string().url(),
  resultNotes:   z.string().optional(),
})

const cancelSchema = z.object({
  status: z.literal("CANCELLED"),
  reason: z.string().optional(),
})

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const exam = await prisma.labExam.findUnique({
    where: { id },
    include: {
      patient:     { include: { patientProfile: true } },
      agent:       { include: { agentProfile: true } },
      requestedBy: { select: { email: true, role: true } },
      payment:     true,
    },
  })
  if (!exam) return NextResponse.json({ error: "Examen non trouvé" }, { status: 404 })

  if (session.user.role === "PATIENT" && exam.patientId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  if (session.user.role === "AGENT_TERRAIN" && exam.agentId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  return NextResponse.json({ success: true, data: exam })
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const exam = await prisma.labExam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "Examen non trouvé" }, { status: 404 })

  const body = await req.json()

  try {
    // Cas 1 — Assigner agent (SUPER_ADMIN)
    if (body.agentId && session.user.role === "SUPER_ADMIN") {
      const { agentId } = assignSchema.parse(body)
      const agent = await prisma.user.findFirst({ where: { id: agentId, role: "AGENT_TERRAIN" } })
      if (!agent) return NextResponse.json({ error: "Agent non trouvé" }, { status: 404 })

      const updated = await prisma.$transaction(async (tx) => {
        const le = await tx.labExam.update({ where: { id }, data: { agentId, status: "ASSIGNED" } })
        await tx.auditLog.create({ data: { userId: session.user.id, action: "LAB_EXAM_ASSIGNED", targetId: id, targetType: "LabExam", details: { agentId } } })
        await tx.notification.create({ data: { userId: exam.patientId, type: "LAB_EXAM_ASSIGNED", title: "Agent assigné", message: "Un agent a été assigné à votre examen de laboratoire." } })
        return le
      })

      const patient = await prisma.user.findUnique({ where: { id: exam.patientId } })
      if (patient?.phone) sendSMS(patient.phone, "Mobile Clinic : Un agent a été assigné à votre examen de laboratoire. Il vous contactera avant le déplacement.").catch(console.error)
      if (agent.phone) sendSMS(agent.phone, `Mobile Clinic : Nouvelle mission prélèvement le ${new Date(exam.scheduledAt).toLocaleDateString("fr-FR")} — ${exam.address}.`).catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    // Cas 2 — Agent terrain : prélèvement effectué
    if (session.user.role === "AGENT_TERRAIN") {
      if (exam.agentId !== session.user.id) return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
      const { status, samplePhotoUrl, agentNotes } = agentUpdateSchema.parse(body)

      const updated = await prisma.$transaction(async (tx) => {
        const le = await tx.labExam.update({
          where: { id },
          data: { status, samplePhotoUrl, agentNotes, collectedAt: new Date() },
        })
        await tx.auditLog.create({ data: { userId: session.user.id, action: "LAB_SAMPLE_COLLECTED", targetId: id, targetType: "LabExam" } })
        await tx.notification.create({ data: { userId: exam.patientId, type: "LAB_SAMPLE_COLLECTED", title: "Prélèvement effectué", message: "Votre prélèvement a été effectué. Les résultats seront disponibles sous 24-48h." } })
        return le
      })

      const patient = await prisma.user.findUnique({ where: { id: exam.patientId } })
      if (patient?.phone) sendSMS(patient.phone, "Mobile Clinic : Votre prélèvement a été effectué avec succès. Les résultats seront disponibles sous 24-48h.").catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    // Cas 3 — Uploader résultats (SUPER_ADMIN)
    if (body.resultFileUrl && session.user.role === "SUPER_ADMIN") {
      const { resultFileUrl, resultNotes } = resultsSchema.parse(body)

      const updated = await prisma.$transaction(async (tx) => {
        const le = await tx.labExam.update({
          where: { id },
          data: { status: "RESULTS_READY", resultFileUrl, resultNotes, resultsAt: new Date() },
        })
        await tx.auditLog.create({ data: { userId: session.user.id, action: "LAB_RESULTS_UPLOADED", targetId: id, targetType: "LabExam" } })
        await tx.notification.create({ data: { userId: exam.patientId, type: "LAB_RESULTS_READY", title: "Résultats disponibles", message: "Vos résultats d'examens de laboratoire sont disponibles. Connectez-vous pour les consulter." } })
        return le
      })

      const patient = await prisma.user.findUnique({ where: { id: exam.patientId } })
      if (patient?.phone) sendSMS(patient.phone, "🔬 Mobile Clinic : Vos résultats d'examens sont disponibles. Connectez-vous sur l'application pour les consulter.").catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    // Cas 4 — Annuler
    if (body.status === "CANCELLED" && ["SUPER_ADMIN", "CALL_CENTER_AGENT"].includes(session.user.role)) {
      const { reason } = cancelSchema.parse(body)
      const updated = await prisma.labExam.update({ where: { id }, data: { status: "CANCELLED" } })

      const patient = await prisma.user.findUnique({ where: { id: exam.patientId } })
      if (patient?.phone) sendSMS(patient.phone, `Mobile Clinic : Votre demande d'examen a été annulée.${reason ? " Raison : " + reason : ""}`).catch(console.error)

      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ error: "Opération non reconnue" }, { status: 400 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Données invalides", details: err.issues }, { status: 400 })
    console.error("[lab-exams/[id] PUT]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
