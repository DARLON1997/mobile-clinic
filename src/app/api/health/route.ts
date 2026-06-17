import { NextResponse } from "next/server"
import { prisma }       from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status:    "ok",
      database:  "connected",
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("[health] DB check failed:", msg)
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 }
    )
  }
}
