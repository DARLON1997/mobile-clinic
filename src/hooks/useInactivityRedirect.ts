"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

const INACTIVITY_MS = 2 * 60 * 1000

// Patterns protégés : jamais de redirection automatique sur ces routes
const PROTECTED = [
  /^\/doctor\/consultation\/.+/,
  /^\/patient\/consultation\/.+/,
  /^\/doctor\/cabinet/,
  /^\/admin\/medecins\/.+\/planning/,
]

const HOME_BY_ROLE: Record<string, string> = {
  SUPER_ADMIN:       "/admin",
  CALL_CENTER_AGENT: "/call-center",
  MEDECIN:           "/doctor",
  AGENT_TERRAIN:     "/agent",
  PATIENT:           "/patient",
  PHARMACIE:         "/pharmacie",
}

export function useInactivityRedirect(role: string) {
  const router   = useRouter()
  const pathname = usePathname()
  const timer    = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks whether a text input has content (dynamic form protection)
  const hasInput = useRef(false)

  useEffect(() => {
    const isProtected =
      PROTECTED.some((p) => p.test(pathname)) || hasInput.current

    if (isProtected) {
      if (timer.current) clearTimeout(timer.current)
      return
    }

    const home = HOME_BY_ROLE[role] ?? "/"

    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        if (pathname !== home && !hasInput.current) {
          router.push(home)
        }
      }, INACTIVITY_MS)
    }

    const onInput = (e: Event) => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        hasInput.current = target.value.trim().length > 0
      }
      reset()
    }

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"]
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))
    window.addEventListener("input", onInput, { passive: true })
    reset()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset))
      window.removeEventListener("input", onInput)
      if (timer.current) clearTimeout(timer.current)
      hasInput.current = false
    }
  }, [pathname, role, router])
}
