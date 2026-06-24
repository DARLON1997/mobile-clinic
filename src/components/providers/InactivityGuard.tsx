"use client"

import { useInactivityRedirect } from "@/hooks/useInactivityRedirect"

export function InactivityGuard({
  role,
  children,
}: {
  role: string
  children: React.ReactNode
}) {
  useInactivityRedirect(role)
  return <>{children}</>
}
