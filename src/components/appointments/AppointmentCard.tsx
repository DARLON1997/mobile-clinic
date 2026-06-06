import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AppointmentStatusBadge, PaymentStatusBadge } from "@/components/shared/StatusBadge"
import type { AppointmentWithRelations } from "@/types"
import { formatDateFR, formatXAF, isVideoRoomActive } from "@/lib/utils"
import { Video, Calendar } from "lucide-react"
import Link from "next/link"

interface AppointmentCardProps {
  appointment: AppointmentWithRelations
  role:        "PATIENT" | "MEDECIN" | "SUPER_ADMIN" | "CALL_CENTER_AGENT"
}

export function AppointmentCard({ appointment, role }: AppointmentCardProps) {
  const canJoin =
    !!appointment.adminApprovedAt &&
    appointment.payment?.status === "PAID" &&
    !!appointment.videoRoomUrl &&
    isVideoRoomActive(appointment.scheduledAt)

  const doctorName = appointment.doctor.doctorProfile
    ? `${appointment.doctor.doctorProfile.firstName} ${appointment.doctor.doctorProfile.lastName}`
    : appointment.doctor.email

  const patientName = appointment.patient.patientProfile
    ? `${appointment.patient.patientProfile.firstName} ${appointment.patient.patientProfile.lastName}`
    : appointment.patient.email

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <AppointmentStatusBadge status={appointment.status} />
              {appointment.payment?.status && (
                <PaymentStatusBadge status={appointment.payment.status} />
              )}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              {formatDateFR(appointment.scheduledAt)}
            </p>
            {role === "PATIENT" && (
              <p className="text-sm text-gray-700">
                Dr <strong>{doctorName}</strong>
                {appointment.doctor.doctorProfile && (
                  <span className="ml-1 text-gray-500">
                    — {appointment.doctor.doctorProfile.speciality}
                  </span>
                )}
              </p>
            )}
            {role !== "PATIENT" && (
              <p className="text-sm text-gray-700">
                Patient : <strong>{patientName}</strong>
              </p>
            )}
            {appointment.doctor.doctorProfile && (
              <p className="text-sm text-gray-500">
                {formatXAF(appointment.doctor.doctorProfile.consultationFee)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {canJoin && appointment.videoRoomUrl && (
              <Link href={`/doctor/consultation/${appointment.id}`}>
                <Button size="sm" className="gap-1.5">
                  <Video className="h-4 w-4" />
                  Rejoindre
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
