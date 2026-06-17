"use client"

import Link        from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarCheck, MessageCircle, User } from "lucide-react"

const TABS = [
  { href: "/patient",              icon: Home,            label: "Accueil"  },
  { href: "/patient/appointments", icon: CalendarCheck,   label: "RDV"      },
  { href: "/patient/prescriptions",icon: MessageCircle,   label: "Soins"    },
  { href: "/patient/medical-record", icon: User,          label: "Profil"   },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background:   "#0A0A0A",
        borderTop:    "1px solid #2A2A2A",
        height:       64,
      }}
    >
      <div className="flex h-full items-center justify-around px-2">
        {TABS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-opacity active:opacity-60"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.6}
                style={{ color: active ? "#C8906A" : "#666" }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? "#C8906A" : "#666" }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
