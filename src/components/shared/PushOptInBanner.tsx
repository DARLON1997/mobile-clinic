"use client"

import { useState } from "react"
import { Bell, X } from "lucide-react"
import { usePushSubscription } from "@/hooks/usePushSubscription"

export function PushOptInBanner() {
  const { isSupported, isSubscribed, isDismissed, subscribe, dismiss } = usePushSubscription()
  const [loading, setLoading] = useState(false)

  if (!isSupported || isSubscribed || isDismissed) return null
  if (typeof Notification !== "undefined" && Notification.permission === "denied") return null

  async function handleEnable() {
    setLoading(true)
    await subscribe()
    setLoading(false)
  }

  return (
    <div
      role="banner"
      aria-label="Activer les notifications"
      style={{
        background:   "linear-gradient(135deg, rgba(200,144,106,0.12), rgba(200,144,106,0.04))",
        borderBottom: "1px solid rgba(200,144,106,0.25)",
        padding:      "10px 20px",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(200,144,106,0.15)]">
          <Bell className="h-4 w-4 text-[#C8906A]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white">Activer les notifications</p>
          <p className="text-[11px] text-[#AAAAAA]">Rappels de rendez-vous et messages, même app fermée.</p>
        </div>
        <button
          onClick={handleEnable}
          disabled={loading}
          className="shrink-0 rounded-lg bg-[#C8906A] px-3 py-1.5 text-[12px] font-semibold text-[#0A0A0A] hover:bg-[#E8B49A] disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "Activer"}
        </button>
        <button
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 text-[#666666] hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
