import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { initializePayment } from "@/lib/flutterwave"
import { z } from "zod"

const schema = z.object({
  appointmentId: z.string().cuid(),
  method:        z.enum(["MTN_MONEY", "AIRTEL_MONEY", "CARD"]),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 })
  }

  try {
    const body = schema.parse(await req.json())

    const appointment = await prisma.appointment.findFirst({
      where: {
        id:              body.appointmentId,
        patientId:       session.user.id,
        adminApprovedAt: { not: null },
        status:          { in: ["APPROVED", "PAYMENT_PENDING"] },
        NOT:             { payment: { status: "PAID" } },
      },
      include: {
        patient: {
          select: {
            email: true,
            phone: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
        doctor: {
          select: { doctorProfile: { select: { consultationFee: true } } },
        },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: "RDV non trouvé ou non éligible au paiement." }, { status: 404 })
    }

    const fee  = appointment.doctor.doctorProfile?.consultationFee ?? 0
    const name = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`
      : (appointment.patient.email ?? "")

    const { paymentLink, txRef } = await initializePayment({
      amount:        fee,
      currency:      "XAF",
      email:         appointment.patient.email ?? "",
      phone:         appointment.patient.phone ?? "",
      name,
      appointmentId: appointment.id,
      method:        body.method,
    })

    // Créer/mettre à jour le paiement + passer le RDV en PAYMENT_PENDING
    await prisma.$transaction([
      prisma.payment.upsert({
        where:  { appointmentId: appointment.id },
        update: { flwRef: txRef, method: body.method, status: "PENDING" },
        create: {
          userId:        session.user.id,
          appointmentId: appointment.id,
          amount:        fee,
          currency:      "XAF",
          method:        body.method,
          status:        "PENDING",
          flwRef:        txRef,
        },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data:  { status: "PAYMENT_PENDING" },
      }),
    ])

    return NextResponse.json({ success: true, paymentLink, txRef })
  } catch (err) {
    console.error("[payments/initialize]", err)
    return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement." }, { status: 500 })
  }
}
