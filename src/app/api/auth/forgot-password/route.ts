import { NextResponse } from "next/server"
import { prisma }       from "@/lib/prisma"
import { z }            from "zod"
import { sendSMS }      from "@/lib/africas-talking"
import { checkApiLimit } from "@/lib/rate-limit"

const schema = z.object({ email: z.string().email() })

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return `+242 ●●●●●●● ${phone.slice(-2)}`
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const allowed = await checkApiLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const { email } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase().trim() },
      select: { id: true, phone: true, isActive: true },
    })

    // Même réponse que le compte existe ou non (évite l'énumération d'emails)
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true, maskedPhone: "+242 ●●●●●●● ??" })
    }

    const code      = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: code, otpExpiry: expiresAt },
    })

    await sendSMS(
      user.phone,
      `Mobile Clinic — Code de réinitialisation : ${code}. Valable 5 min. Ne partagez jamais ce code.`
    )

    return NextResponse.json({ success: true, maskedPhone: maskPhone(user.phone) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 })
    }
    console.error("[forgot-password]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
