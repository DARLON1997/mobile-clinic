import { UserPlus, CalendarCheck, ShieldCheck, Video } from "lucide-react"

const STEPS = [
  {
    number: "01",
    icon: UserPlus,
    title: "Inscription",
    description: "Créez votre compte patient en 3 étapes : informations personnelles, dossier médical de base, et mot de passe sécurisé.",
  },
  {
    number: "02",
    icon: CalendarCheck,
    title: "Choix du médecin",
    description: "Parcourez les médecins disponibles, choisissez votre spécialiste et réservez le créneau qui vous convient.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Validation & paiement",
    description: "Votre demande est examinée par notre équipe. Une fois approuvée, payez en MTN Money, Airtel Money ou carte.",
  },
  {
    number: "04",
    icon: Video,
    title: "Consultation",
    description: "Rejoignez la salle vidéo sécurisée. Le médecin vous remet une ordonnance numérique PDF en fin de séance.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#0A0A0A] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        {/* En-tête */}
        <div className="mb-14 text-center">
          <p className="font-slogan mb-3 text-[11px] text-[#C8906A]">Processus</p>
          <h2 className="font-heading text-3xl text-white sm:text-4xl">Comment ça marche ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-[#AAAAAA]">
            De l&apos;inscription à la consultation, tout est simple et sécurisé.
          </p>
        </div>

        {/* Étapes */}
        <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ligne de connexion desktop */}
          <div className="absolute left-[12.5%] right-[12.5%] top-10 hidden h-px lg:block"
            style={{ background: "linear-gradient(90deg, transparent, rgba(200,144,106,0.2), rgba(200,144,106,0.2), transparent)" }} />

          {STEPS.map(({ number, icon: Icon, title, description }) => (
            <div key={number} className="group relative flex flex-col items-center text-center">
              {/* Numéro fantôme */}
              <span className="font-cormorant pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none text-7xl font-semibold italic leading-none"
                style={{ color: "rgba(200,144,106,0.07)" }}>
                {number}
              </span>

              {/* Icône */}
              <div className="relative z-10 mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[rgba(200,144,106,0.2)] bg-[#141414] transition-all duration-300 group-hover:border-[rgba(200,144,106,0.5)] group-hover:shadow-[0_0_24px_rgba(200,144,106,0.15)]">
                <Icon className="h-7 w-7 text-[#C8906A]" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#C8906A] to-[#E8B49A] font-montserrat text-[11px] font-bold text-[#0A0A0A]">
                  {parseInt(number)}
                </span>
              </div>

              <h3 className="font-heading mb-2 text-sm text-white">{title}</h3>
              <p className="text-xs leading-relaxed text-[#666666]">{description}</p>
            </div>
          ))}
        </div>

        {/* Note sécurité */}
        <div className="mt-14 rounded-2xl border border-[rgba(200,144,106,0.2)] bg-[rgba(200,144,106,0.04)] p-6 text-center">
          <p className="text-sm text-[#AAAAAA]">
            <span className="font-medium text-[#C8906A]">🔒 Sécurité garantie :</span>{" "}
            chaque mise en contact médecin ↔ patient est approuvée par notre équipe.
            Vos données médicales sont chiffrées et protégées.
          </p>
        </div>
      </div>
    </section>
  )
}
