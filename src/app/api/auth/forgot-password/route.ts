import { NextResponse }  from "next/server"
import { prisma }        from "@/lib/prisma"
import { z }             from "zod"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { checkApiLimit } from "@/lib/rate-limit"

const schema = z.object({ email: z.string().email() })

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  return `${local.slice(0, 3)}***@${domain}`
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const allowed = await checkApiLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const { email } = schema.parse(await req.json())
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({
      where:  { email: normalizedEmail },
      select: { id: true, email: true, isActive: true },
    })

    // Même réponse que le compte existe ou non (évite l'énumération d'emails)
    if (!user || !user.isActive) {
      return NextResponse.json({ success: true, maskedEmail: `${email.slice(0, 3)}***@${email.split("@")[1] ?? ""}` })
    }

    const code      = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: code, otpExpiry: expiresAt },
    })

    await sendEmail(
      user.email,
      "Réinitialisation de mot de passe — Mobile Clinic",
      emailTemplates.otp(code, "reset")
    )

    return NextResponse.json({ success: true, maskedEmail: maskEmail(user.email) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 })
    }
    console.error("[forgot-password]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
