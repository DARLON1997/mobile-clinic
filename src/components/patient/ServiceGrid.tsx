"use client"

import Link from "next/link"
import {
  Video, CalendarCheck, Building2, Pill,
  Home, FlaskConical, FileText, BookOpen,
} from "lucide-react"
import { useState } from "react"

const SERVICES = [
  { icon: Video,         label: "Consultation\nvidéo",   href: "/patient/book",           color: "#C8906A" },
  { icon: CalendarCheck, label: "Prendre\nun RDV",       href: "/patient/appointments",   color: "#C8906A" },
  { icon: Building2,     label: "Présentiel",            href: "/patient/presentiel",     color: "#C8906A" },
  { icon: Pill,          label: "Pharmacie",             href: "/patient/pharmacie",      color: "#C8906A" },
  { icon: Home,          label: "Soins\ndomicile",       href: "/patient/home-visit",     color: "#C8906A" },
  { icon: FlaskConical,  label: "Examens\nlabo",         href: "/patient/lab-exams",      color: "#C8906A" },
  { icon: FileText,      label: "Mon\ndossier",          href: "/patient/medical-record", color: "#C8906A" },
  { icon: BookOpen,      label: "Ordonnances",           href: "/patient/prescriptions",  color: "#C8906A" },
]

function ServiceTile({ icon: Icon, label, href, color }: typeof SERVICES[0]) {
  const [pressed, setPressed] = useState(false)

  return (
    <Link href={href}>
      <div
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        className="flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-transform"
        style={{
          background:   "#141414",
          borderColor:  "#2A2A2A",
          transform:    pressed ? "scale(0.93)" : "scale(1)",
          transition:   "transform 0.12s ease",
          minHeight:    86,
        }}
      >
        <Icon size={26} style={{ color }} strokeWidth={1.6} />
        <span
          className="text-center whitespace-pre-line text-white leading-tight"
          style={{ fontSize: 11, fontWeight: 500 }}
        >
          {label}
        </span>
      </div>
    </Link>
  )
}

export function ServiceGrid() {
  return (
    <div className="mb-5">
      <div className="grid grid-cols-4 gap-2.5">
        {SERVICES.map((s) => (
          <ServiceTile key={s.href} {...s} />
        ))}
      </div>
    </div>
  )
}
