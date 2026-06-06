import type { UserRole } from "@/types"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:       "Super Admin",
  CALL_CENTER_AGENT: "Call Center",
  MEDECIN:           "Médecin",
  AGENT_TERRAIN:     "Agent Terrain",
  PATIENT:           "Patient",
}

interface HeaderProps {
  title:    string
  role:     UserRole
  userName: string | null
}

export function Header({ title, role, userName }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-100 bg-white/95 px-6 backdrop-blur-sm">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2">
          <Badge variant="default">{ROLE_LABELS[role]}</Badge>
          <span className="hidden text-sm text-gray-500 sm:block">{userName}</span>
        </div>
      </div>
    </header>
  )
}
