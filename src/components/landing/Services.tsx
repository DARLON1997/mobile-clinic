import { Video, Home, TestTube2, Pill } from "lucide-react"

const SERVICES = [
  {
    icon: Video,
    label: "VIDEO",
    title: "Consultation vidéo",
    description:
      "Consultez un médecin généraliste ou spécialiste en direct depuis chez vous. Salle vidéo sécurisée, ordonnance numérique PDF incluse.",
    details: ["Généralistes & spécialistes", "Ordonnance numérique PDF", "Suivi de dossier médical"],
    color: "#5090D3",
    bg: "rgba(80,144,211,0.08)",
  },
  {
    icon: Home,
    label: "DOMICILE",
    title: "Soins à domicile",
    description:
      "Un agent de santé qualifié se déplace à votre adresse. Idéal pour les patients à mobilité réduite ou les soins réguliers.",
    details: ["Suivi GPS temps réel", "Rapport de fin de visite", "Photo de confirmation"],
    color: "#4CAF87",
    bg: "rgba(76,175,135,0.08)",
    featured: true,
  },
  {
    icon: TestTube2,
    label: "LABORATOIRE",
    title: "Prélèvements biologiques",
    description:
      "Vos analyses biologiques effectuées à domicile. Les résultats sont intégrés directement dans votre dossier médical numérique.",
    details: ["Prise de sang, ECBU, etc.", "Résultats dans votre espace", "Transmission sécurisée"],
    color: "#9B6DD6",
    bg: "rgba(155,109,214,0.08)",
  },
  {
    icon: Pill,
    label: "PHARMACIE",
    title: "Pharmacie en ligne",
    description:
      "Recherchez vos médicaments, soumettez votre ordonnance et faites-vous livrer à domicile par nos pharmacies partenaires à Brazzaville.",
    details: ["Recherche de médicaments", "Ordonnance numérique", "Livraison MTN / Airtel Money"],
    color: "#C8906A",
    bg: "rgba(200,144,106,0.08)",
  },
]

export function Services() {
  return (
    <section id="services" className="bg-[#0D0D0D] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* En-tête */}
        <div className="mb-14 text-center">
          <p className="font-slogan mb-3 text-[11px] text-[#C8906A]">Nos services</p>
          <h2 className="font-heading text-3xl text-white sm:text-4xl">
            Tout ce dont vous avez besoin,{" "}
            <span className="font-brand italic text-[#C8906A]">sans vous déplacer</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#AAAAAA]">
            Trois modes de consultation adaptés à votre situation, disponibles
            partout au Congo-Brazzaville.
          </p>
        </div>

        {/* Grille */}
        <div className="grid gap-5 sm:grid-cols-3">
          {SERVICES.map(({ icon: Icon, label, title, description, details, color, bg, featured }) => (
            <div key={title}
              className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 ${
                featured
                  ? "border-[rgba(200,144,106,0.3)] bg-[#141414] hover:shadow-[0_8px_32px_rgba(200,144,106,0.1)]"
                  : "border-[#2A2A2A] bg-[#141414] hover:border-[rgba(200,144,106,0.2)]"
              }`}
            >
              {featured && (
                <div className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{ background: "linear-gradient(135deg, rgba(200,144,106,0.04) 0%, transparent 60%)" }} />
              )}

              <div className="mb-5 flex items-center justify-between">
                <div className="rounded-xl p-3 transition-all duration-300 group-hover:scale-110"
                  style={{ background: bg }}>
                  <Icon className="h-5 w-5 transition-colors duration-300"
                    style={{ color }} />
                </div>
                <span className="font-montserrat text-[10px] font-semibold tracking-[0.12em] text-[#444444] uppercase">
                  {label}
                </span>
              </div>

              <h3 className="font-heading mb-2.5 text-base text-white">{title}</h3>
              <p className="mb-5 text-sm leading-relaxed text-[#AAAAAA]">{description}</p>

              <ul className="space-y-2">
                {details.map((d) => (
                  <li key={d} className="flex items-center gap-2.5 text-xs text-[#666666]">
                    <span className="h-1 w-1 rounded-full flex-shrink-0"
                      style={{ background: color }} />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
