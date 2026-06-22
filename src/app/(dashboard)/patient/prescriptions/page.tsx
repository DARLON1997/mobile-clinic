import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import { formatDate } from "@/lib/utils"
import { OrdonnancesGrid } from "@/components/patient/OrdonnancesGrid"

export default async function PrescriptionsPage() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")

  const consultations = await prisma.consultation.findMany({
    where: {
      appointment: { patientId: session.user.id },
      OR: [
        { prescriptionUrl:   { not: null } },
        { ordonnancePhotoUrl: { not: null } },
      ],
    },
    include: {
      appointment: {
        select: {
          scheduledAt: true,
          doctor: { select: { doctorProfile: { select: { firstName: true, lastName: true, speciality: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Construire la liste unifiée (une ordonnance photo + un PDF peuvent coexister pour la même consultation)
  type OrdonnanceItem = {
    id: string; type: "photo" | "pdf"; url: string
    doctorName: string; speciality: string | null; date: string; numero: string
  }

  const items: OrdonnanceItem[] = []
  let idx = 0

  for (const c of consultations) {
    const dp = c.appointment.doctor.doctorProfile
    const doctorName = dp ? `Dr ${dp.firstName} ${dp.lastName}` : "Médecin"
    const date       = formatDate(c.appointment.scheduledAt)
    const year       = new Date(c.createdAt).getFullYear()

    if (c.ordonnancePhotoUrl) {
      idx++
      items.push({
        id:         `photo-${c.id}`,
        type:       "photo",
        url:        c.ordonnancePhotoUrl,
        doctorName,
        speciality: dp?.speciality ?? null,
        date,
        numero:     `MC-${year}-${String(idx).padStart(4, "0")}`,
      })
    }
    if (c.prescriptionUrl) {
      idx++
      items.push({
        id:         `pdf-${c.id}`,
        type:       "pdf",
        url:        c.prescriptionUrl,
        doctorName,
        speciality: dp?.speciality ?? null,
        date,
        numero:     `MC-${year}-${String(idx).padStart(4, "0")}`,
      })
    }
  }

  const photoCount = items.filter(i => i.type === "photo").length
  const pdfCount   = items.filter(i => i.type === "pdf").length

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl text-white">Mes ordonnances</h1>
        <p className="mt-1 text-sm text-[#666666]">
          {items.length === 0
            ? "Aucune ordonnance disponible."
            : `${photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : ""}${photoCount > 0 && pdfCount > 0 ? " · " : ""}${pdfCount > 0 ? `${pdfCount} PDF` : ""}`
          }
        </p>
      </div>

      <OrdonnancesGrid items={items} />
    </div>
  )
}
