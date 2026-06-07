import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  const { id } = await params

  const exam = await prisma.labExam.findUnique({ where: { id } })
  if (!exam) return NextResponse.json({ error: "Examen non trouvé" }, { status: 404 })

  const isPatient = session.user.role === "PATIENT" && exam.patientId === session.user.id
  const isAdmin   = session.user.role === "SUPER_ADMIN"
  const isDoctor  = session.user.role === "MEDECIN"

  if (!isPatient && !isAdmin && !isDoctor)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })

  if (!exam.resultFileUrl)
    return NextResponse.json({ error: "Résultats non disponibles" }, { status: 404 })

  await prisma.auditLog.create({
    data: {
      userId:     session.user.id,
      action:     "LAB_RESULTS_ACCESSED",
      targetId:   id,
      targetType: "LabExam",
      details:    { role: session.user.role },
    },
  })

  return NextResponse.json({ success: true, resultFileUrl: exam.resultFileUrl })
}
