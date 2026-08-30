"use client"

import Link        from "next/link"
import { usePathname } from "next/navigation"

type TabItem = { href: string; label: string; icon: React.ElementType }

interface MobileTabBarProps {
  items: TabItem[]
}

/**
 * Barre d'onglets basse persistante (mobile) — généralisée à tous les rôles
 * à partir de NAV[role] dans Sidebar.tsx (audit UI/UX C2). Remplace
 * l'ancien components/patient/BottomNav.tsx, qui n'existait que pour le
 * rôle Patient et dupliquait à la main icône/libellé/route (cause du
 * bug M2 : dérivation depuis une seule source de vérité pour l'éliminer
 * structurellement plutôt que de corriger la duplication).
 */
export function MobileTabBar({ items }: MobileTabBarProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background:    "#0A0A0A",
        borderTop:     "1px solid #2A2A2A",
        height:        `calc(64px + env(safe-area-inset-bottom))`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
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
