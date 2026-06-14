import { NextResponse }  from "next/server"
import { prisma }        from "@/lib/prisma"
import bcrypt            from "bcryptjs"
import { z }             from "zod"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { checkApiLimit, checkLoginLimit } from "@/lib/rate-limit"

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

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

  const apiAllowed = await checkApiLimit(ip)
  if (!apiAllowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const { email: rawEmail, password } = schema.parse(await req.json())
    const email = rawEmail.toLowerCase().trim()

    const limit = await checkLoginLimit(email).catch(() => ({ allowed: true }))
    if (!limit.allowed) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans une heure." }, { status: 429 })
    }

    const user = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    })

    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 })
    }

    const code      = generateOtp()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: code, otpExpiry: expiresAt },
    })

    await sendEmail(
      user.email,
      "Code de connexion — Mobile Clinic",
      emailTemplates.otp(code, "login")
    )

    return NextResponse.json({ success: true, maskedEmail: maskEmail(user.email) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    }
    console.error("[pre-login]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
