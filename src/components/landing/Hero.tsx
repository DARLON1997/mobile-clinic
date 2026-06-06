import Link from "next/link"
import { Video, MapPin, CheckCircle } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#0A0A0A] pt-20">
      {/* Halo lumineux rose gold */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200,144,106,0.07) 0%, transparent 70%)", filter: "blur(60px)" }} />
      <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(200,144,106,0.04) 0%, transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-6">
        <div className="max-w-3xl">
          {/* Badge géo */}
          <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-[rgba(200,144,106,0.25)] bg-[rgba(200,144,106,0.06)] px-4 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#C8906A]" />
            <span className="font-montserrat text-xs font-medium tracking-[0.1em] text-[#C8906A] uppercase">
              Congo-Brazzaville
            </span>
          </div>

          {/* Slogan */}
          <p className="animate-fade-in-up delay-100 font-slogan mb-3 text-[11px] tracking-[0.2em] text-[#C8906A]">
            La santé plus proche de vous
          </p>

          {/* Titre principal */}
          <h1 className="animate-fade-in-up delay-200 font-brand mb-6 text-5xl leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Mobile Clinic
          </h1>

          {/* Description */}
          <p className="animate-fade-in-up delay-300 mb-10 max-w-xl text-base leading-relaxed text-[#AAAAAA]">
            Consultez un médecin en vidéo, recevez des soins à domicile ou
            faites réaliser vos prélèvements biologiques — partout où vous êtes au Congo.
          </p>

          {/* CTAs */}
          <div className="animate-fade-in-up delay-400 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <button className="btn-gold flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold tracking-[0.06em] w-full sm:w-auto">
                <Video className="h-4 w-4" />
                Prendre un rendez-vous
              </button>
            </Link>
            <Link href="#how-it-works">
              <button className="flex items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-transparent px-8 py-3.5 text-sm font-medium text-[#AAAAAA] transition-all hover:border-[rgba(200,144,106,0.3)] hover:text-white w-full sm:w-auto">
                Comment ça marche
              </button>
            </Link>
          </div>

          {/* Garanties */}
          <div className="mt-10 flex flex-wrap gap-6">
            {[
              "Médecins certifiés",
              "Données sécurisées",
              "Résultats rapides",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2 text-sm text-[#666666]">
                <CheckCircle className="h-4 w-4 text-[#4CAF87]" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[#2A2A2A]">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-[#2A2A2A] px-5 sm:px-6">
          {[
            { value: "100+", label: "Patients actifs" },
            { value: "15+",  label: "Médecins certifiés" },
            { value: "24/7", label: "Disponible" },
          ].map(({ value, label }) => (
            <div key={label} className="px-4 py-6 text-center sm:px-8">
              <p className="font-cormorant text-3xl font-semibold italic text-[#C8906A] sm:text-4xl">{value}</p>
              <p className="font-montserrat mt-1 text-[11px] uppercase tracking-[0.1em] text-[#666666]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
