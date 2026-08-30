"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  /** Texte accessible du dialogue si aucun titre visible n'a d'id exploitable. */
  ariaLabel?: string
  /** id d'un élément de titre déjà présent dans children — préféré à ariaLabel si fourni. */
  labelledBy?: string
  /** Classes du conteneur plein écran (positionnement du panneau : centré, ancré à gauche…). */
  className?: string
  /** Classes du panneau du dialogue lui-même. */
  panelClassName?: string
  panelStyle?: React.CSSProperties
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

/**
 * Comportement de dialogue accessible partagé (audit M3) : role="dialog",
 * aria-modal, piège de focus (Tab/Shift+Tab bouclent dans le panneau),
 * fermeture par Échap, focus rendu à l'élément déclencheur à la fermeture.
 * Ne dicte aucun style visuel — chaque appelant garde son propre habillage
 * (carte centrée, tiroir plein écran…) via className/panelClassName.
 */
export function Modal({
  open, onClose, children, ariaLabel, labelledBy, className, panelClassName, panelStyle,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab") return

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last  = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={cn("fixed inset-0 z-50", className)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={panelClassName}
        style={panelStyle}
      >
        {children}
      </div>
    </div>
  )
}
