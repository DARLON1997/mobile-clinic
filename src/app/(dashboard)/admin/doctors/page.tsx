import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import { Badge }    from "@/components/ui/badge"
import { formatXAF } from "@/lib/utils"
import Image from "next/image"

const SPECIALITY_LABELS: Record<string, string> = {
  GENERALISTE:   "Généraliste",
  CARDIOLOGUE:   "Cardiologue",
  DERMATOLOGUE:  "Dermatologue",
  PEDIATRE:      "Pédiatre",
  GYNECOLOGUE:   "Gynécologue",
  OPHTALMOLOGUE: "Ophtalmologue",
  PSYCHIATRE:    "Psychiatre",
  NEUROLOGUE:    "Neurologue",
  ORTHOPEDIE:    "Orthopédiste",
  AUTRE:         "Autre",
}

export default async function DoctorsPage() {
  const session = await auth()
  if (session?.user.role !== "SUPER_ADMIN") redirect("/unauthorized")

  const doctors = await prisma.user.findMany({
    where:   { role: "MEDECIN" },
    include: { doctorProfile: true },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des médecins</h1>
          <p className="text-sm text-gray-500">{doctors.length} médecin{doctors.length > 1 ? "s" : ""} enregistré{doctors.length > 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <th className="px-4 py-3 text-left">Médecin</th>
              <th className="px-4 py-3 text-left">Spécialité</th>
              <th className="px-4 py-3 text-left">Tarif</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {doctors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Aucun médecin enregistré.
                </td>
              </tr>
            ) : doctors.map((doc) => {
              const dp = doc.doctorProfile
              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {dp?.avatarUrl ? (
                        <Image src={dp.avatarUrl} alt="" width={36} height={36}
                          className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
                          {dp ? `${dp.firstName.charAt(0)}${dp.lastName.charAt(0)}` : "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {dp ? `Dr ${dp.firstName} ${dp.lastName}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400">{doc.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {dp ? SPECIALITY_LABELS[dp.speciality] ?? dp.speciality : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {dp ? formatXAF(dp.consultationFee) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!dp ? (
                      <Badge variant="warning">Profil incomplet</Badge>
                    ) : dp.isVerifiedByAdmin ? (
                      doc.isActive
                        ? <Badge variant="success">Vérifié</Badge>
                        : <Badge variant="danger">Suspendu</Badge>
                    ) : (
                      <Badge variant="warning">En attente</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {dp && !dp.isVerifiedByAdmin && (
                        <form action={`/api/admin/doctors/${doc.id}/verify`} method="POST">
                          <button className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700">
                            Valider
                          </button>
                        </form>
                      )}
                      {doc.isActive ? (
                        <form action={`/api/admin/users/${doc.id}/suspend`} method="POST">
                          <button className="rounded-lg bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100">
                            Suspendre
                          </button>
                        </form>
                      ) : (
                        <form action={`/api/admin/users/${doc.id}/reactivate`} method="POST">
                          <button className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100">
                            Réactiver
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
