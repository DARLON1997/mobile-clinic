"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { getPusherClient } from "@/lib/pusher-client"
import { useSession } from "next-auth/react"

type Notif = {
  id:        string
  type:      string
  title:     string
  message:   string
  isRead:    boolean
  createdAt: string
}

export function NotificationBell() {
  const { data: session } = useSession()
  const [open,   setOpen]   = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unread, setUnread] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return
      const json = await res.json()
      setNotifs(json.data ?? [])
      setUnread(json.unreadCount ?? 0)
    } catch { /* silencieux */ }
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ markAll: true }),
    })
    setNotifs((n) => n.map((x) => ({ ...x, isRead: true })))
    setUnread(0)
  }

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, isRead: true } : x))
    setUnread((c) => Math.max(0, c - 1))
  }

  useEffect(() => {
    load()
    // Fallback polling réduit (2 min) — Pusher est la source principale
    const fallback = setInterval(load, 120_000)
    return () => clearInterval(fallback)
  }, [])

  // Pusher : écoute sur le canal propre à l'utilisateur
  useEffect(() => {
    if (!session?.user?.id) return
    const pusher = getPusherClient()
    if (!pusher) return
    const role = session.user.role as string
    let channelName: string
    if (role === "MEDECIN")           channelName = `private-doctor-${session.user.id}`
    else if (role === "PATIENT")      channelName = `private-patient-${session.user.id}`
    else if (role === "SUPER_ADMIN")  channelName = "private-admin-notifications"
    else if (role === "CALL_CENTER_AGENT") channelName = "private-call-center-inbox"
    else return
    const ch = pusher.subscribe(channelName)
    ch.bind("notification-bell-update",   load)
    ch.bind("appointment-status-changed", load)
    ch.bind("presentiel-status-changed",  load)
    ch.bind("appointment-approved",       load)
    ch.bind("new-approval-request",       load)
    return () => { pusher.unsubscribe(channelName) }
  }, [session?.user?.id, session?.user?.role])

  // Fermer en cliquant en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) load() }}
        className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                  Tout marquer lu
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Aucune notification
              </p>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.isRead) markRead(n.id) }}
                  className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-gray-50 ${!n.isRead ? "bg-blue-50/50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{n.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
