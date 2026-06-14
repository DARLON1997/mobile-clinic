import { NextResponse } from "next/server"
import { prisma }       from "@/lib/prisma"
import bcrypt           from "bcryptjs"
import { z }            from "zod"
import { checkApiLimit } from "@/lib/rate-limit"

const schema = z.object({
  email:       z.string().email(),
  otp:         z.string().length(6),
  newPassword: z.string().regex(
    /^(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Minimum 8 caractères, une majuscule et un chiffre"
  ),
})

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const allowed = await checkApiLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const { email, otp, newPassword } = schema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where:  { email: email.toLowerCase().trim() },
      select: { id: true, isActive: true, otpCode: true, otpExpiry: true },
    })

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 })
    }

    if (!user.otpCode || !user.otpExpiry) {
      return NextResponse.json({ error: "Code invalide ou expiré." }, { status: 400 })
    }

    if (new Date() > user.otpExpiry) {
      return NextResponse.json({ error: "Code expiré. Demandez un nouveau code." }, { status: 400 })
    }

    if (user.otpCode !== otp) {
      return NextResponse.json({ error: "Code invalide." }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data:  { passwordHash, otpCode: null, otpExpiry: null },
    })

    prisma.auditLog.create({
      data: {
        userId:  user.id,
        action:  "PASSWORD_RESET",
        details: { method: "sms_otp" },
      },
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Données invalides." }, { status: 400 })
    }
    console.error("[reset-password]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
