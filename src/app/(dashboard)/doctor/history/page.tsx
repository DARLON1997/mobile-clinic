import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AppointmentCard } from "@/components/appointments/AppointmentCard"
import type { AppointmentWithRelations } from "@/types"

export default async function DoctorHistoryPage() {
  const session = await auth()
  if (session?.user.role !== "MEDECIN") redirect("/unauthorized")

  const history = await prisma.appointment.findMany({
    where: {
      doctorId:        session.user.id,
      status:          "COMPLETED",
      adminApprovedAt: { not: null },
    },
    include: {
      patient: {
        select: {
          id: true, email: true, phone: true,
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
      doctor: {
        select: {
          id: true, email: true,
          doctorProfile: { select: { firstName: true, lastName: true, speciality: true, consultationFee: true } },
        },
      },
      payment:      { select: { status: true, amount: true } },
      consultation: { select: { id: true, diagnosis: true, prescriptionUrl: true } },
    },
    orderBy: { scheduledAt: "desc" },
  }) as unknown as AppointmentWithRelations[]

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Historique des consultations</h1>
      <div className="space-y-4">
        {history.map((a) => <AppointmentCard key={a.id} appointment={a} role="MEDECIN" />)}
        {history.length === 0 && <p className="text-gray-500">Aucune consultation terminée.</p>}
      </div>
    </div>
  )
}
