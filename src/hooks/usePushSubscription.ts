"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY  = "push-notif-dismissed-until"
const DISMISS_DAYS = 30

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw     = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export interface PushSubscriptionState {
  isSupported: boolean
  isSubscribed: boolean
  isDismissed: boolean
  subscribe: () => Promise<void>
  dismiss: () => void
}

export function usePushSubscription(): PushSubscriptionState {
  const [isSupported, setIsSupported]   = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDismissed, setIsDismissed]   = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    setIsSupported(true)

    const until = localStorage.getItem(STORAGE_KEY)
    if (until && Date.now() < Number(until)) setIsDismissed(true)

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(!!sub))
      .catch(() => {})
  }, [])

  const subscribe = async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) return

    const permission = await Notification.requestPermission()
    if (permission !== "granted") return

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    await fetch("/api/push/subscribe", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(sub.toJSON()),
    })

    setIsSubscribed(true)
  }

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
    localStorage.setItem(STORAGE_KEY, String(until))
    setIsDismissed(true)
  }

  return { isSupported, isSubscribed, isDismissed, subscribe, dismiss }
}
