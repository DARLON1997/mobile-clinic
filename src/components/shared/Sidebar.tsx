"use client"

import Link      from "next/link"
import Image     from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import type { UserRole } from "@/types"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, CalendarCheck, Users, ShieldCheck,
  DollarSign, ScrollText, Video, History, BookOpen,
  Home, FileText, MapPin, LogOut, Menu, X, Heart,
  FlaskConical, Syringe, MessageCircle,
} from "lucide-react"

type NavItem = { href: string; label: string; icon: React.ElementType }

const NAV: Record<UserRole, NavItem[]> = {
  SUPER_ADMIN: [
    { href: "/admin",                label: "Tableau de bord",  icon: LayoutDashboard },
    { href: "/admin/approvals",      label: "Autorisations",    icon: ShieldCheck },
    { href: "/admin/doctors",        label: "Médecins",         icon: Video },
    { href: "/admin/users",          label: "Utilisateurs",     icon: Users },
    { href: "/admin/lab-exams",      label: "Examens labo",     icon: FlaskConical },
    { href: "/admin/nursing-cares",  label: "Soins infirmiers", icon: Syringe },
    { href: "/admin/elderly-cares",  label: "Soins seniors",    icon: Users },
    { href: "/admin/finances",       label: "Finances",         icon: DollarSign },
    { href: "/admin/audit",          label: "Journal d'audit",  icon: ScrollText },
  ],
  MEDECIN: [
    { href: "/doctor",              label: "Planning",    icon: LayoutDashboard },
    { href: "/doctor/appointments", label: "Rendez-vous", icon: CalendarCheck },
    { href: "/doctor/history",      label: "Historique",  icon: History },
  ],
  PATIENT: [
    { href: "/patient",                label: "Accueil",         icon: LayoutDashboard },
    { href: "/patient/book",           label: "Prendre un RDV",  icon: CalendarCheck },
    { href: "/patient/appointments",   label: "Mes RDV",         icon: CalendarCheck },
    { href: "/patient/home-visit",     label: "Soin à domicile", icon: Home },
    { href: "/patient/lab-exams",      label: "Examens labo",    icon: FlaskConical },
    { href: "/patient/nursing-care",   label: "Soins infirmiers",icon: Syringe },
    { href: "/patient/elderly-care",   label: "Soins seniors",   icon: Users },
    { href: "/patient/medical-record", label: "Dossier médical", icon: FileText },
    { href: "/patient/prescriptions",  label: "Ordonnances",     icon: BookOpen },
  ],
  CALL_CENTER_AGENT: [
    { href: "/call-center",              label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/call-center/appointments", label: "Rendez-vous",     icon: CalendarCheck },
    { href: "/call-center/home-visits",  label: "Soins domicile",  icon: Home },
    { href: "/call-center/chats",        label: "Conversations",   icon: MessageCircle },
  ],
  AGENT_TERRAIN: [
    { href: "/agent", label: "Mes missions", icon: MapPin },
  ],
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN:      "Administrateur",
  MEDECIN:          "Médecin",
  PATIENT:          "Patient",
  CALL_CENTER_AGENT:"Call Center",
  AGENT_TERRAIN:    "Agent Terrain",
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

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-[#2A2A2A] px-6 pb-6 mb-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8906A] to-[#E8B49A]">
          <Heart className="h-4 w-4 text-[#0A0A0A]" fill="currentColor" />
        </div>
        <div>
          <p className="font-cormorant text-base font-semibold italic text-white leading-none">Mobile Clinic</p>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.12em] text-[#666666]">Télémédecine</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {items.map(({ href, label, icon: Icon }) => {
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
        <form action="/api/auth/signout" method="post">
          <button type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[#666666] transition-colors hover:bg-[rgba(232,84,84,0.08)] hover:text-[#E85454]">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-screen w-[260px] shrink-0 flex-col border-r border-[#2A2A2A] bg-[#0A0A0A] pt-6">
        <NavContent />
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#141414] border border-[#2A2A2A] text-white md:hidden"
        aria-label="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 flex w-[260px] flex-col bg-[#0A0A0A] border-r border-[#2A2A2A] pt-6 animate-fade-in">
            <button onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[#666666] hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  )
}
