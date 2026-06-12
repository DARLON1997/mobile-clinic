import { auth }     from "@/auth"
import { redirect }  from "next/navigation"
import { prisma }    from "@/lib/prisma"
import Link          from "next/link"
import { Phone, Mail, CalendarCheck, ChevronRight, BadgeCheck, Clock } from "lucide-react"
import { formatXAF } from "@/lib/utils"

const SPECIALITY_LABEL: Record<string, string> = {
  GENERALISTE:   "Médecin généraliste",
  CARDIOLOGUE:   "Cardiologue",
  DERMATOLOGUE:  "Dermatologue",
  PEDIATRE:      "Pédiatre",
  GYNECOLOGUE:   "Gynécologue",
  OPHTALMOLOGUE: "Ophtalmologue",
  PSYCHIATRE:    "Psychiatre",
  NEUROLOGUE:    "Neurologue",
  ORTHOPEDIE:    "Orthopédiste",
  AUTRE:         "Autre spécialité",
}

const SPECIALITY_COLOR: Record<string, { bg: string; text: string; avatar: string }> = {
  GENERALISTE:   { bg: "bg-blue-50",    text: "text-blue-700",   avatar: "from-blue-500 to-blue-600"    },
  CARDIOLOGUE:   { bg: "bg-red-50",     text: "text-red-700",    avatar: "from-red-500 to-red-600"      },
  DERMATOLOGUE:  { bg: "bg-pink-50",    text: "text-pink-700",   avatar: "from-pink-500 to-pink-600"    },
  PEDIATRE:      { bg: "bg-green-50",   text: "text-green-700",  avatar: "from-green-500 to-green-600"  },
  GYNECOLOGUE:   { bg: "bg-purple-50",  text: "text-purple-700", avatar: "from-purple-500 to-purple-600"},
  OPHTALMOLOGUE: { bg: "bg-cyan-50",    text: "text-cyan-700",   avatar: "from-cyan-500 to-cyan-600"    },
  PSYCHIATRE:    { bg: "bg-indigo-50",  text: "text-indigo-700", avatar: "from-indigo-500 to-indigo-600"},
  NEUROLOGUE:    { bg: "bg-violet-50",  text: "text-violet-700", avatar: "from-violet-500 to-violet-600"},
  ORTHOPEDIE:    { bg: "bg-orange-50",  text: "text-orange-700", avatar: "from-orange-500 to-orange-600"},
  AUTRE:         { bg: "bg-gray-50",    text: "text-gray-700",   avatar: "from-gray-500 to-gray-600"    },
}

export default async function DoctorsDirectoryPage() {
  const session = await auth()
  if (session?.user.role !== "CALL_CENTER_AGENT") redirect("/unauthorized")

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const doctors = await prisma.user.findMany({
    where: { role: "MEDECIN", isActive: true },
    select: {
      id:    true,
      email: true,
      phone: true,
      doctorProfile: {
        select: {
          firstName:         true,
          lastName:          true,
          speciality:        true,
          consultationFee:   true,
          bio:               true,
          licenseNumber:     true,
          isVerifiedByAdmin: true,
        },
      },
      appointmentsAsDoctor: {
        where: { scheduledAt: { gte: today, lt: tomorrow } },
        select: { id: true, status: true, scheduledAt: true },
        orderBy: { scheduledAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Compter les RDV total par médecin (tous statuts)
  const appointmentCounts = await prisma.appointment.groupBy({
    by: ["doctorId"],
    _count: { id: true },
    where: {
      doctorId: { in: doctors.map(d => d.id) },
      status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
    },
  })
  const countMap = Object.fromEntries(appointmentCounts.map(r => [r.doctorId, r._count.id]))

  const verifiedCount = doctors.filter(d => d.doctorProfile?.isVerifiedByAdmin).length
  const totalWithProfile = doctors.filter(d => !!d.doctorProfile).length

  // Regrouper par spécialité
  const specialities = [...new Set(
    doctors.filter(d => d.doctorProfile).map(d => d.doctorProfile!.speciality)
  )]

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Répertoire médical</h1>
          <p className="text-sm text-gray-500">
            {totalWithProfile} médecin{totalWithProfile > 1 ? "s" : ""} actif{totalWithProfile > 1 ? "s" : ""}
            {" · "}{verifiedCount} vérifié{verifiedCount > 1 ? "s" : ""}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-center">
            <p className="text-xl font-bold text-gray-900">{totalWithProfile}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Médecins</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-center">
            <p className="text-xl font-bold text-green-700">{verifiedCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-green-600">Vérifiés</p>
          </div>
        </div>
      </div>

      {/* Résumé par spécialité */}
      {specialities.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {specialities.map(spec => {
            const count  = doctors.filter(d => d.doctorProfile?.speciality === spec).length
            const colors = SPECIALITY_COLOR[spec] ?? SPECIALITY_COLOR.AUTRE
            return (
              <span key={spec} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colors.bg} ${colors.text}`}>
                {SPECIALITY_LABEL[spec] ?? spec}
                <span className="font-bold">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Grille médecins */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {doctors.filter(d => !!d.doctorProfile).map(doc => {
          const dp       = doc.doctorProfile!
          const initials = `${dp.firstName.charAt(0)}${dp.lastName.charAt(0)}`
          const colors   = SPECIALITY_COLOR[dp.speciality] ?? SPECIALITY_COLOR.AUTRE
          const totalAppts = countMap[doc.id] ?? 0

          const todayAppts   = doc.appointmentsAsDoctor
          const activeAppt   = todayAppts.find(a => a.status === "IN_PROGRESS")
          const nextAppt     = todayAppts.find(a => ["CONFIRMED", "PENDING"].includes(a.status))
          const todayDone    = todayAppts.filter(a => a.status === "COMPLETED").length

          return (
            <div key={doc.id}
              className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">

              {/* Header carte */}
              <div className="p-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors.avatar} text-sm font-bold text-white shadow-sm`}>
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 leading-tight">
                        Dr {dp.firstName} {dp.lastName}
                      </p>
                      <span className={`inline-block mt-0.5 text-[11px] font-medium ${colors.text}`}>
                        {SPECIALITY_LABEL[dp.speciality] ?? dp.speciality}
                      </span>
                    </div>
                  </div>

                  {/* Badge vérification */}
                  {dp.isVerifiedByAdmin ? (
                    <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                      <BadgeCheck className="h-3 w-3" />
                      Vérifié
                    </div>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      Non vérifié
                    </span>
                  )}
                </div>

                {/* Contact */}
                <div className="mt-4 space-y-2">
                  <a href={`tel:${doc.phone}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    {doc.phone}
                  </a>
                  <a href={`mailto:${doc.email}`}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span className="truncate">{doc.email}</span>
                  </a>
                </div>
              </div>

              {/* Stats du jour */}
              <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
                <div className="px-3 py-3 text-center">
                  <p className="text-base font-bold text-gray-900">{todayAppts.length}</p>
                  <p className="text-[10px] text-gray-400">Aujourd&apos;hui</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-base font-bold text-green-700">{todayDone}</p>
                  <p className="text-[10px] text-gray-400">Terminés</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-base font-bold text-blue-700">{totalAppts}</p>
                  <p className="text-[10px] text-gray-400">Total</p>
                </div>
              </div>

              {/* Statut activité */}
              <div className="border-t border-gray-100 px-4 py-3">
                {activeAppt ? (
                  <div className="flex items-center gap-2 text-xs text-purple-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" />
                    Consultation en cours
                  </div>
                ) : nextAppt ? (
                  <div className="flex items-center gap-1.5 text-xs text-blue-600">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    Prochain RDV : {new Date(nextAppt.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Pas de RDV prévu aujourd&apos;hui</p>
                )}
              </div>

              {/* Tarif + action */}
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-4 py-3">
                <span className="text-xs font-semibold text-blue-600">
                  {formatXAF(dp.consultationFee)} / consultation
                </span>
                <Link href={`/call-center/appointments?doctorId=${doc.id}`}>
                  <div className="flex items-center gap-1 rounded-lg bg-white border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors cursor-pointer">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    RDV
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </div>
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {totalWithProfile === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-400">Aucun médecin actif enregistré dans le système.</p>
        </div>
      )}
    </div>
  )
}
