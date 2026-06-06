import Link from "next/link"
import { Heart, Phone, Mail, MapPin } from "lucide-react"
import { InstallPWA } from "@/components/shared/InstallPWA"

export function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] bg-[#0A0A0A]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="mb-5 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8906A] to-[#E8B49A]">
                <Heart className="h-4 w-4 text-[#0A0A0A]" fill="currentColor" />
              </div>
              <span className="font-cormorant text-xl font-semibold italic text-white">Mobile Clinic</span>
            </Link>
            <p className="font-slogan mb-2 text-[10px] text-[#C8906A]">
              La santé plus proche de vous
            </p>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-[#666666]">
              La plateforme de télémédecine du Congo-Brazzaville.
              Consultations vidéo, soins à domicile, prélèvements biologiques.
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-[#666666]">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#C8906A]" />
                Brazzaville, République du Congo
              </span>
              <span className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#C8906A]" />
                +242 06 XXX XX XX
              </span>
              <span className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#C8906A]" />
                contact@mobileclinic.cg
              </span>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-montserrat mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              Services
            </h4>
            <ul className="space-y-2.5 text-sm text-[#666666]">
              <li><Link href="/register" className="hover:text-[#C8906A] transition-colors">Consultation vidéo</Link></li>
              <li><Link href="/register" className="hover:text-[#C8906A] transition-colors">Soins à domicile</Link></li>
              <li><Link href="/register" className="hover:text-[#C8906A] transition-colors">Prélèvements biologiques</Link></li>
            </ul>
          </div>

          {/* Accès */}
          <div>
            <h4 className="font-montserrat mb-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
              Accès
            </h4>
            <ul className="space-y-2.5 text-sm text-[#666666]">
              <li><Link href="/login"    className="hover:text-[#C8906A] transition-colors">Connexion</Link></li>
              <li><Link href="/register" className="hover:text-[#C8906A] transition-colors">Créer un compte</Link></li>
              <li><Link href="#how-it-works" className="hover:text-[#C8906A] transition-colors">Comment ça marche</Link></li>
            </ul>
            <div className="mt-6">
              <InstallPWA />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#2A2A2A] pt-6 text-xs text-[#444444] sm:flex-row">
          <p>© {new Date().getFullYear()} Mobile Clinic — Tous droits réservés.</p>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-[#C8906A] transition-colors">Politique de confidentialité</Link>
            <Link href="#" className="hover:text-[#C8906A] transition-colors">Conditions d&apos;utilisation</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
