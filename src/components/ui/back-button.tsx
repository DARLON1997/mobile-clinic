"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BackButtonProps {
  onClick?:  () => void
  label?:    string
  variant?:  "link" | "button" // "link" = texte discret (détail de page) — "button" = bouton ghost (assistant multi-étapes)
  className?: string
}

/**
 * Bouton retour centralisé (audit M5) — remplace les implémentations
 * dupliquées à la main (router.back() + ArrowLeft recodé à chaque écran).
 * Sans onClick, retombe sur router.back().
 */
export function BackButton({ onClick, label = "Retour", variant = "link", className }: BackButtonProps) {
  const router = useRouter()
  const handleClick = onClick ?? (() => router.back())

  if (variant === "button") {
    return (
      <Button type="button" variant="ghost" onClick={handleClick} className={className}>
        <ArrowLeft className="h-4 w-4" /> {label}
      </Button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn("flex items-center gap-1.5 text-sm text-[#666666] transition-colors hover:text-white", className)}
    >
      <ArrowLeft className="h-4 w-4" /> {label}
    </button>
  )
}
