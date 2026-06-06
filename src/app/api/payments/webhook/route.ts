import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPayment, verifyWebhookSignature } from "@/lib/flutterwave"
import { sendSMS, smsTemplates } from "@/lib/africas-talking"
import { sendEmail, emailTemplates } from "@/lib/mailer"
import { triggerAdminNotification } from "@/lib/pusher"
import { formatXAF } from "@/lib/utils"

export async function POST(req: Request) {
  const signature = req.headers.get("verif-hash")

  if (!verifyWebhookSignature(signature, process.env.FLW_WEBHOOK_SECRET ?? "")) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 })
  }

  try {
    const payload = await req.json()

    if (payload.event !== "charge.completed") {
      return NextResponse.json({ received: true })
    }

    const { status, tx_ref: txRef, id: transactionId } = payload.data

    if (status !== "successful") {
      const payment = await prisma.payment.findFirst({ where: { flwRef: txRef } })
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
      }
      return NextResponse.json({ received: true })
    }

    // Vérification double côté Flutterwave
    const verified = await verifyPayment(String(transactionId))
    if (!verified.success) return NextResponse.json({ error: "Paiement non vérifié" }, { status: 400 })

    // Trouver le paiement via la référence de transaction
    const payment = await prisma.payment.findFirst({
      where: { flwRef: txRef },
      include: {
        appointment: {
          include: {
            patient: {
              select: {
                email: true,
                phone: true,
                patientProfile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    })

    if (!payment?.appointment) {
      return NextResponse.json({ error: "Paiement ou RDV introuvable" }, { status: 404 })
    }

    const { appointment } = payment

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data:  { status: "PAID", flwTxId: String(transactionId) },
      }),
      prisma.appointment.update({
        where: { id: appointment.id },
        data:  { status: "CONFIRMED" },
      }),
      prisma.auditLog.create({
        data: {
          userId:     appointment.patientId,
          action:     "PAYMENT_RECEIVED",
          targetType: "Payment",
          targetId:   payment.id,
          details:    { amount: verified.amount, txRef: verified.txRef },
        },
      }),
    ])

    // Notification temps réel Admin
    await triggerAdminNotification("payment-received", {
      appointmentId: appointment.id,
      amount:        formatXAF(verified.amount),
      txRef:         verified.txRef,
    })

    // SMS + Email confirmation
    const patientName = appointment.patient.patientProfile
      ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`
      : ""
    const amountStr = formatXAF(verified.amount)

    if (appointment.patient.phone) {
      sendSMS(appointment.patient.phone,
        smsTemplates.paymentConfirmed(patientName, amountStr)).catch(console.error)
    }
    if (appointment.patient.email) {
      sendEmail(
        appointment.patient.email,
        "Paiement confirmé — Mobile Clinic",
        emailTemplates.paymentReceipt(patientName, amountStr, verified.txRef)
      ).catch(console.error)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[webhook payment]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
