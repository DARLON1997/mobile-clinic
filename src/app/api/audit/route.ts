import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Réservé au Super Admin" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page       = Math.max(1, parseInt(searchParams.get("page")       ?? "1"))
  const limit      = Math.min(100, parseInt(searchParams.get("limit")    ?? "50"))
  const userId     = searchParams.get("userId")     ?? undefined
  const action     = searchParams.get("action")     ?? undefined
  const targetType = searchParams.get("targetType") ?? undefined
  const dateFrom   = searchParams.get("dateFrom")   ?? undefined
  const dateTo     = searchParams.get("dateTo")     ?? undefined

  const where: Record<string, unknown> = {}
  if (userId)     where.userId     = userId
  if (action)     where.action     = action
  if (targetType) where.targetType = targetType
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {}
    if (dateFrom) range.gte = new Date(dateFrom)
    if (dateTo)   range.lte = new Date(dateTo)
    where.createdAt = range
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
  ])

  return NextResponse.json({ success: true, data: logs, meta: { total, page, limit } })
}
