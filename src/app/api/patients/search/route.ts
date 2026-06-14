import { NextResponse } from "next/server"
import { auth }         from "@/auth"
import { prisma }       from "@/lib/prisma"
import { checkApiLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const session = await auth()
  if (!session || (session.user.role !== "CALL_CENTER_AGENT" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const allowed = await checkApiLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] })
  }

  const patients = await prisma.user.findMany({
    where: {
      role: "PATIENT",
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { patientProfile: { firstName: { contains: q, mode: "insensitive" } } },
        { patientProfile: { lastName:  { contains: q, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      email: true,
      phone: true,
      patientProfile: { select: { firstName: true, lastName: true } },
    },
    take: 10,
  })

  // Audit RGPD : tracer toute consultation de données patient
  prisma.auditLog.create({
    data: {
      userId:     session.user.id,
      action:     "PATIENT_SEARCH",
      targetType: "PatientProfile",
      details:    { query: q, resultsCount: patients.length },
    },
  }).catch(console.error)

  return NextResponse.json({ data: patients })
}
