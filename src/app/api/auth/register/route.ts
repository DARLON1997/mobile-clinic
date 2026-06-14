import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { sendSMS } from "@/lib/africas-talking"
import { checkApiLimit } from "@/lib/rate-limit"

const schema = z.object({
  firstName:        z.string().min(2),
  lastName:         z.string().min(2),
  email:            z.string().email(),
  // Format Congo : +242XXXXXXXXX
  phone:            z.string().regex(/^\+242\d{9}$/, "Format requis : +242XXXXXXXXX"),
  // Min 8 chars, au moins 1 majuscule et 1 chiffre
  password:         z.string().regex(
    /^(?=.*[A-Z])(?=.*\d).{8,}$/,
    "Minimum 8 caractères, une majuscule et un chiffre"
  ),
  gender:           z.enum(["M", "F"]),
  dateOfBirth:      z.string().min(1),
  address:          z.string().min(3),
  city:             z.string().min(2).default("Brazzaville"),
  bloodType:        z.string().optional(),
  allergies:        z.string().optional(),
  medicalHistory:   z.string().optional(),
  emergencyContact: z.string().optional(),
})

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
  const allowed = await checkApiLimit(ip)
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 })
  }

  try {
    const data = schema.parse(await req.json())

    const [existingEmail, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email: data.email } }),
      prisma.user.findUnique({ where: { phone: data.phone } }),
    ])

    if (existingEmail) {
      return NextResponse.json({ error: "Un compte avec cet email existe déjà." }, { status: 409 })
    }
    if (existingPhone) {
      return NextResponse.json({ error: "Un compte avec ce numéro existe déjà." }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    // RÈGLE R8 : transaction — User + PatientProfile + Notification
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email:        data.email,
          phone:        data.phone,
          passwordHash,
          role:         "PATIENT",
          isVerified:   false,
          patientProfile: {
            create: {
              firstName:        data.firstName,
              lastName:         data.lastName,
              dateOfBirth:      new Date(data.dateOfBirth),
              gender:           data.gender,
              address:          data.address,
              city:             data.city,
              bloodType:        data.bloodType        || null,
              allergies:        data.allergies        || null,
              medicalHistory:   data.medicalHistory   || null,
              emergencyContact: data.emergencyContact || null,
            },
          },
        },
      })

      await tx.notification.create({
        data: {
          userId:  newUser.id,
          type:    "WELCOME",
          title:   "Bienvenue sur Mobile Clinic",
          message: `Bonjour ${data.firstName}, votre compte est créé. Prenez votre premier RDV !`,
        },
      })

      return newUser
    })

    // Email + SMS de bienvenue (non bloquants)
    const fullName = `${data.firstName} ${data.lastName}`
    sendEmail(
      data.email,
      "Bienvenue sur Mobile Clinic",
      emailTemplates.welcome(fullName)
    ).catch(console.error)

    sendSMS(
      data.phone,
      `Bienvenue sur Mobile Clinic, ${data.firstName} ! Votre compte patient est créé. Connectez-vous sur l'application pour prendre votre premier RDV.`
    ).catch(console.error)

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides.", details: err.issues }, { status: 400 })
    }
    console.error("[register]", err)
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 })
  }
}
