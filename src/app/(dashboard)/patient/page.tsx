import { auth }    from "@/auth"
import { redirect } from "next/navigation"
import { prisma }   from "@/lib/prisma"
import Link         from "next/link"
import { Heart }    from "lucide-react"

import { NotificationBell }       from "@/components/notifications/NotificationBell"
import { PromoBanner }            from "@/components/patient/PromoBanner"
import { ServiceGrid }            from "@/components/patient/ServiceGrid"
import { NextAppointmentCard }    from "@/components/patient/NextAppointmentCard"
import { HealthNews }             from "@/components/patient/HealthNews"
import { BottomNav }              from "@/components/patient/BottomNav"
import type { SerializedAppointment } from "@/components/patient/NextAppointmentCard"

export default async function PatientDashboard() {
  const session = await auth()
  if (session?.user.role !== "PATIENT") redirect("/unauthorized")

  const today = new Date()

  const [profile, nextAppt] = await Promise.all([
    prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      select: { firstName: true, lastName: true, avatarUrl: true },
    }),
    prisma.appointment.findFirst({
      where: {
        patientId:   session.user.id,
        status:      { in: ["CONFIRMED", "IN_PROGRESS", "PAYMENT_PENDING", "AWAITING_APPROVAL"] },
        scheduledAt: { gte: today },
      },
      include: {
        doctor: {
          select: {
            doctorProfile: { select: { firstName: true, lastName: true, speciality: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ])

  const firstName = profile?.firstName ?? session.user.name?.split(" ")[0] ?? "Patient"
  const initials  = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .map((n) => n![0].toUpperCase())
    .join("") || firstName[0]?.toUpperCase() || "P"

  // Sérialiser les dates pour les Client Components
  const apptData: SerializedAppointment = nextAppt
    ? {
        id:          nextAppt.id,
        scheduledAt: nextAppt.scheduledAt.toISOString(),
        status:      nextAppt.status,
        doctor:      nextAppt.doctor,
      }
    : null

  return (
    <>
      {/* ── Wrapper patient : plein écran mobile, carte sur desktop ── */}
      <div
        className="mx-auto max-w-lg"
        style={{
          animation: "mc-fade-in 0.3s ease both",
        }}
      >
        {/* ───────────────────────────────────────────────────────────
            SECTION 1 — Header sticky (mobile uniquement)
            Sur desktop la sidebar remplace ce header.
            padding-left 60px pour laisser la place au hamburger
            du Sidebar qui est fixé à left-4 top-4 sur mobile.
        ─────────────────────────────────────────────────────────── */}
        <header
          className="sticky top-0 z-20 -mx-4 -mt-4 mb-5 flex h-16 items-center
                     border-b pl-14 pr-4 md:hidden"
          style={{ background: "#0A0A0A", borderColor: "#2A2A2A" }}
        >
          {/* Logo centré */}
          <div className="flex flex-1 items-center justify-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "rgba(200,144,106,0.15)", border: "1px solid rgba(200,144,106,0.3)" }}
            >
              <Heart size={16} style={{ color: "#C8906A", fill: "#C8906A" }} />
            </div>
            <span
              className="font-bold text-white"
              style={{ fontSize: 15, letterSpacing: "-0.01em" }}
            >
              Mobile Clinic
            </span>
          </div>

          {/* Droite : notif + avatar */}
          <div className="flex items-center gap-2">
            {/* NotificationBell adapté au fond sombre */}
            <div className="[&_button]:text-[#888] [&_button:hover]:bg-[#1E1E1E] [&_button:hover]:text-white">
              <NotificationBell />
            </div>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
              style={{
                background: "rgba(200,144,106,0.15)",
                color:      "#C8906A",
                border:     "1px solid rgba(200,144,106,0.3)",
              }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* ── Salutation (desktop visible, mobile hidden car header s'en charge) ── */}
        <div className="mb-5 hidden md:block">
          <p className="text-2xl font-bold text-white">
            Bonjour, {firstName}&nbsp;👋
          </p>
          <p className="mt-0.5 text-sm" style={{ color: "#666" }}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Salutation mobile (sous le header) */}
        <div className="mb-4 md:hidden">
          <p className="font-bold text-white" style={{ fontSize: 17 }}>
            Bonjour, {firstName}&nbsp;👋
          </p>
          <p className="text-[12px]" style={{ color: "#666" }}>
            {today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* ─────────────────────────────────────────────────────────
            SECTION 2 — Bannière carrousel animée
        ───────────────────────────────────────────────────────── */}
        <PromoBanner />

        {/* ─────────────────────────────────────────────────────────
            SECTION 3 — Grille de services (8 icônes)
        ───────────────────────────────────────────────────────── */}
        <ServiceGrid />

        {/* ─────────────────────────────────────────────────────────
            SECTION 4 — Prochain rendez-vous
        ───────────────────────────────────────────────────────── */}
        <NextAppointmentCard appt={apptData} />

        {/* ─────────────────────────────────────────────────────────
            SECTION 5 — Actualités santé (scroll horizontal)
        ───────────────────────────────────────────────────────── */}
        <HealthNews />

        {/* Espace pour la bottom nav sur mobile */}
        <div className="h-16 md:hidden" />
      </div>

      {/* ─────────────────────────────────────────────────────────
          SECTION 6 — Navigation basse fixe (mobile uniquement)
      ───────────────────────────────────────────────────────── */}
      <BottomNav />

      {/* Animation d'apparition */}
      <style>{`
        @keyframes mc-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </>
  )
}
