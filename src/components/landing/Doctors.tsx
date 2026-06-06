import Link  from "next/link"
import Image from "next/image"
import { prisma }    from "@/lib/prisma"
import { formatXAF } from "@/lib/utils"

const SPECIALITY_LABELS: Record<string, string> = {
  GENERALISTE:   "Médecin Généraliste",
  CARDIOLOGUE:   "Cardiologue",
  DERMATOLOGUE:  "Dermatologue",
  PEDIATRE:      "Pédiatre",
  GYNECOLOGUE:   "Gynécologue",
  OPHTALMOLOGUE: "Ophtalmologue",
  PSYCHIATRE:    "Psychiatre",
  NEUROLOGUE:    "Neurologue",
  ORTHOPEDIE:    "Orthopédiste",
  AUTRE:         "Spécialiste",
}

export async function Doctors() {
  const doctors = await prisma.doctorProfile.findMany({
    where:   { isVerifiedByAdmin: true },
    take:    3,
    orderBy: { createdAt: "asc" },
  })

  return (
    <section id="doctors" className="bg-[#0D0D0D] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* En-tête */}
        <div className="mb-14 text-center">
          <p className="font-slogan mb-3 text-[11px] text-[#C8906A]">Notre équipe</p>
          <h2 className="font-heading text-3xl text-white sm:text-4xl">Médecins disponibles</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#AAAAAA]">
            Des praticiens certifiés et expérimentés pour vous accompagner
          </p>
        </div>

        {doctors.length === 0 ? (
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] py-16 text-center">
            <p className="text-[#666666]">Les profils médecins seront disponibles prochainement.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doc) => (
              <div key={doc.id}
                className="group flex flex-col items-center rounded-2xl border border-[#2A2A2A] bg-[#141414] p-7 text-center transition-all duration-300 hover:border-[rgba(200,144,106,0.3)] hover:shadow-[0_8px_32px_rgba(200,144,106,0.08)]"
              >
                {/* Avatar */}
                {doc.avatarUrl ? (
                  <Image src={doc.avatarUrl} alt={`Dr ${doc.firstName} ${doc.lastName}`}
                    width={88} height={88}
                    className="mb-5 h-[88px] w-[88px] rounded-full object-cover ring-2 ring-[rgba(200,144,106,0.3)] group-hover:ring-[#C8906A] transition-all duration-300"
                  />
                ) : (
                  <div className="mb-5 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] ring-2 ring-[rgba(200,144,106,0.3)] group-hover:ring-[#C8906A] transition-all duration-300 text-2xl font-bold text-[#C8906A]">
                    {doc.firstName.charAt(0)}{doc.lastName.charAt(0)}
                  </div>
                )}

                <h3 className="font-heading text-base text-white">
                  Dr {doc.firstName} {doc.lastName}
                </h3>
                <p className="font-montserrat mt-1 text-[11px] uppercase tracking-[0.1em] text-[#666666]">
                  {SPECIALITY_LABELS[doc.speciality] ?? doc.speciality}
                </p>
                <p className="mt-3 font-semibold text-[#C8906A]">
                  À partir de {formatXAF(doc.consultationFee)}
                </p>

                <Link href="/register" className="mt-5 w-full">
                  <button className="w-full rounded-xl border border-[rgba(200,144,106,0.3)] bg-transparent py-2.5 font-montserrat text-[13px] font-medium tracking-wide text-[#C8906A] transition-all duration-200 hover:bg-[rgba(200,144,106,0.1)]">
                    Prendre RDV
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/register">
            <button className="rounded-xl border border-[#2A2A2A] px-8 py-3 font-montserrat text-sm font-medium text-[#AAAAAA] transition-all hover:border-[rgba(200,144,106,0.3)] hover:text-white">
              Voir tous nos médecins →
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
