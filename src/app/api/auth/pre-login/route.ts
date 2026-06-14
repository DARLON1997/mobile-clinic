import { NextResponse } from "next/server"
import { prisma }       from "@/lib/prisma"
import bcrypt           from "bcryptjs"
import { z }            from "zod"
import { sendSMS }      from "@/lib/africas-talking"
import { checkApiLimit, checkLoginLimit } from "@/lib/rate-limit"

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  const suffix = phone.slice(-2)
  return `+242 ●●●●●●● ${suffix}`
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
      select: { id: true, phone: true, passwordHash: true, isActive: true },
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

    await sendSMS(
      user.phone,
      `Mobile Clinic — Code de connexion : ${code}. Valable 5 min. Ne partagez jamais ce code.`
    )

    return NextResponse.json({ success: true, maskedPhone: maskPhone(user.phone) })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides." }, { status: 400 })
    }
    console.error("[pre-login]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
