"use client"

import Link      from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import type { UserRole } from "@/types"
import { cn } from "@/lib/utils"
import { LogoMark } from "@/components/shared/LogoMark"
import { MobileTabBar } from "@/components/shared/MobileTabBar"
import { Modal } from "@/components/ui/modal"
import {
  LayoutDashboard, CalendarCheck, Users, ShieldCheck,
  DollarSign, ScrollText, Video, History, BookOpen,
  Home, FileText, MapPin, LogOut, Menu, X,
  FlaskConical, Syringe, MessageCircle, Pill,
  ShoppingCart, Settings, TrendingUp, Store,
  CalendarDays, BookUser, Gift,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV: Record<UserRole, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/admin",                label: "Tableau de bord",  icon: LayoutDashboard },
    { href: "/admin/approvals",      label: "Autorisations",    icon: ShieldCheck },
    { href: "/admin/patients",       label: "Patients",         icon: Users },
    { href: "/admin/presentiel",     label: "Présentiel",       icon: CalendarDays },
    { href: "/admin/doctors",        label: "Médecins",         icon: Video },
    { href: "/admin/users",          label: "Utilisateurs",     icon: Users },
    { href: "/admin/lab-exams",      label: "Examens labo",     icon: FlaskConical },
    { href: "/admin/examens",         label: "Examens prescrits",icon: FlaskConical },
    { href: "/admin/nursing-cares",  label: "Soins infirmiers", icon: Syringe },
    { href: "/admin/elderly-cares",  label: "Soins seniors",    icon: Users },
    { href: "/admin/pharmacies",     label: "Pharmacies",       icon: Store },
    { href: "/admin/referrals",      label: "Parrainage",       icon: Gift },
    { href: "/admin/finances",       label: "Finances",         icon: DollarSign },
    { href: "/admin/audit",          label: "Journal d'audit",  icon: ScrollText },
  ],
  MEDECIN: [
    { href: "/doctor",              label: "Planning",    icon: LayoutDashboard },
    { href: "/doctor/appointments", label: "Rendez-vous", icon: CalendarCheck },
    { href: "/doctor/presentiel",   label: "Présentiel",  icon: CalendarDays },
    { href: "/doctor/history",      label: "Historique",  icon: History },
  ],
  PATIENT: [
    { href: "/patient",                label: "Accueil",         icon: LayoutDashboard },
    { href: "/patient/book",           label: "Prendre un RDV",  icon: CalendarCheck },
    { href: "/patient/presentiel",     label: "Présentiel",      icon: CalendarDays },
    { href: "/patient/appointments",   label: "Mes RDV",         icon: CalendarCheck },
    { href: "/patient/home-visit",     label: "Soin à domicile", icon: Home },
    { href: "/patient/lab-exams",      label: "Examens labo",    icon: FlaskConical },
    { href: "/patient/nursing-care",   label: "Soins infirmiers",icon: Syringe },
    { href: "/patient/elderly-care",   label: "Soins seniors",   icon: Users },
    { href: "/patient/medical-record", label: "Dossier médical", icon: FileText },
    { href: "/patient/prescriptions",  label: "Ordonnances",     icon: BookOpen },
    { href: "/patient/pharmacie",      label: "Pharmacie",       icon: Pill },
    { href: "/patient/parrainage",     label: "Parrainage",      icon: Gift },
  ],
  CALL_CENTER_AGENT: [
    { href: "/call-center",                  label: "Tableau de bord",  icon: LayoutDashboard },
    { href: "/call-center/appointments",     label: "Rendez-vous",      icon: CalendarCheck },
    { href: "/call-center/patients",         label: "Annuaire patients",icon: Users },
    { href: "/call-center/agenda",           label: "Agenda médecins",  icon: CalendarDays },
    { href: "/call-center/home-visits",      label: "Soins domicile",   icon: Home },
    { href: "/call-center/chats",            label: "Conversations",    icon: MessageCircle },
    { href: "/call-center/ordonnances",      label: "Ordonnances",      icon: Pill },
    { href: "/call-center/doctors",          label: "Répertoire",       icon: BookUser },
    { href: "/call-center/referrals",        label: "Parrainage",       icon: Gift },
  ],
  AGENT_TERRAIN: [
    { href: "/agent", label: "Mes missions", icon: MapPin },
  ],
  PHARMACIE: [
    { href: "/pharmacie",           label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/pharmacie/commandes", label: "Commandes",       icon: ShoppingCart },
    { href: "/pharmacie/catalogue", label: "Mon catalogue",   icon: Pill },
    { href: "/pharmacie/stats",     label: "Statistiques",    icon: TrendingUp },
    { href: "/pharmacie/profil",    label: "Mon profil",      icon: Settings },
  ],
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN:       "Administrateur",
  MEDECIN:           "Médecin",
  PATIENT:           "Patient",
  CALL_CENTER_AGENT: "Call Center",
  AGENT_TERRAIN:     "Agent Terrain",
  PHARMACIE:         "Pharmacie",
}

// Onglets persistants de la barre basse mobile (audit UI/UX — C2).
// Références par href vers NAV ci-dessus : une seule source de vérité pour
// label/icône, pour ne jamais reproduire la divergence icône/libellé/route
// corrigée en M2. AGENT_TERRAIN n'a qu'une seule destination (AgentShell,
// pas de Sidebar) et n'a donc pas d'entrée ici.
const BOTTOM_TAB_HREFS: Partial<Record<UserRole, string[]>> = {
  SUPER_ADMIN:       ["/admin", "/admin/approvals", "/admin/patients", "/admin/finances"],
  MEDECIN:           ["/doctor", "/doctor/appointments", "/doctor/presentiel", "/doctor/history"],
  PATIENT:           ["/patient", "/patient/appointments", "/patient/prescriptions", "/patient/medical-record"],
  CALL_CENTER_AGENT: ["/call-center", "/call-center/appointments", "/call-center/patients", "/call-center/chats"],
  PHARMACIE:         ["/pharmacie", "/pharmacie/commandes", "/pharmacie/catalogue", "/pharmacie/stats"],
}

interface SidebarProps {
  role:     UserRole
  userName: string | null
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname    = usePathname()
  const [open, setOpen] = useState(false)

  const items = NAV[role] ?? []
  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  // C2 — onglets bas dérivés de `items` par href (voir BOTTOM_TAB_HREFS) :
  // le tiroir mobile n'a plus besoin de reproposer ces destinations, il ne
  // garde que le reste (navigation secondaire) + le bloc compte/déconnexion.
  const bottomHrefs = BOTTOM_TAB_HREFS[role]
  const bottomTabs  = bottomHrefs
    ?.map((href) => items.find((i) => i.href === href))
    .filter((i): i is NavItem => Boolean(i)) ?? []
  const drawerItems = bottomHrefs
    ? items.filter((i) => !bottomHrefs.includes(i.href))
    : items

  const NavContent = ({ navItems }: { navItems: NavItem[] }) => (
    <>
      {/* Logo — cercle pinceau compact */}
      <div className="flex items-center gap-3 border-b border-[#2A2A2A] px-5 pb-5 mb-2">
        <LogoMark size="xs" showText={false} />
        <div>
          <p className="font-cormorant text-base font-semibold italic text-white leading-none">Mobile Clinic</p>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.12em] text-[#666666]">Télémédecine</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-150",
                    "font-montserrat font-medium",
                    active
                      ? "bg-[rgba(200,144,106,0.12)] text-[#C8906A] border-r-2 border-[#C8906A]"
                      : "text-[#AAAAAA] hover:bg-[#202020] hover:text-white"
                  )}
                >
                  <Icon className={cn("h-[18px] w-[18px] flex-shrink-0 transition-colors", active ? "text-[#C8906A]" : "text-[#666666] group-hover:text-white")} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer utilisateur */}
      <div className="border-t border-[#2A2A2A] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] text-[13px] font-semibold text-[#C8906A] ring-1 ring-[rgba(200,144,106,0.3)]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">{userName ?? "Utilisateur"}</p>
            <p className="font-montserrat text-[10px] uppercase tracking-[0.08em] text-[#666666]">
              {ROLE_LABEL[role]}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#666666] transition-colors hover:bg-[rgba(232,84,84,0.08)] hover:text-[#E85454]">
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — liste complète, non affectée par C2/C1 (pas de mobile) */}
      <aside className="hidden md:flex h-screen w-[260px] shrink-0 flex-col border-r border-[#2A2A2A] bg-[#0A0A0A] pt-6">
        <NavContent navItems={items} />
      </aside>

      {/* Mobile hamburger button — inchangé : reste le point d'entrée de la
          navigation secondaire (règle C2), sa position ne bouge pas pour ne
          pas casser le padding qui lui est réservé dans les headers de page
          (ex. patient/page.tsx). */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-[calc(1rem+env(safe-area-inset-top))] z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#141414] border border-[#2A2A2A] text-white md:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay — tiroir plein écran (C1 : zones de sécurité) ne
          contenant plus que la navigation secondaire (C2) */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        ariaLabel="Menu de navigation"
        className="md:hidden"
        panelClassName="absolute left-0 top-0 bottom-0 flex w-[260px] flex-col bg-[#0A0A0A] border-r border-[#2A2A2A] animate-fade-in"
        panelStyle={{
          paddingTop:    "calc(1.5rem + env(safe-area-inset-top))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <button onClick={() => setOpen(false)}
          aria-label="Fermer le menu"
          className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] text-[#666666] hover:text-white">
          <X className="h-5 w-5" />
        </button>
        <NavContent navItems={drawerItems} />
      </Modal>

      {/* Barre d'onglets basse persistante (C2) — remplace le hamburger
          comme accès principal aux destinations les plus utilisées du rôle */}
      {bottomTabs.length > 0 && <MobileTabBar items={bottomTabs} />}
    </>
  )
}
