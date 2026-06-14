"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, X, Send, ChevronDown } from "lucide-react"
import { cn, isSameDay, formatDateLabel } from "@/lib/utils"
import { getPusherClient } from "@/lib/pusher-client"
import { playNotificationSound, showBrowserNotification } from "@/lib/chat-notifications"
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble"

interface Props { userId: string }

type Chat = { id: string; subject: string; isOpen: boolean }

export function PatientChatWidget({ userId }: Props) {
  const [open,     setOpen]     = useState(false)
  const [chat,     setChat]     = useState<Chat | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg,   setNewMsg]   = useState("")
  const [unread,   setUnread]   = useState(0)
  const [subject,  setSubject]  = useState("")
  const [creating, setCreating] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" })
  }, [])

  // Charger le chat existant au démarrage
  useEffect(() => {
    fetch("/api/support-chat")
      .then(r => r.json())
      .then(j => {
        const chats: Chat[] = j.data ?? []
        const active = chats.find(c => c.isOpen)
        if (active) setChat(active)
      })
  }, [])

  // Charger les messages quand le chat s'ouvre
  useEffect(() => {
    if (!chat || !open) return
    fetch(`/api/support-chat/${chat.id}/messages`)
      .then(r => r.json())
      .then(j => {
        setMessages(j.data ?? [])
        setUnread(0)
        setTimeout(() => scrollToBottom(false), 50)
      })
  }, [chat?.id, open, scrollToBottom])

  // Pusher — canal du chat actif
  useEffect(() => {
    if (!chat) return
    const pusher = getPusherClient()
    if (!pusher) return

    const channel = pusher.subscribe(`private-chat-${chat.id}`)
    channel.bind("new-message", (msg: ChatMessage) => {
      if (msg.senderRole === "PATIENT") return // message optimiste déjà affiché
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (!open) {
        setUnread(n => n + 1)
        playNotificationSound()
        showBrowserNotification("💬 Support Mobile Clinic", msg.content)
      } else {
        setTimeout(scrollToBottom, 50)
      }
    })

    return () => { pusher.unsubscribe(`private-chat-${chat.id}`) }
  }, [chat?.id, open, scrollToBottom])

  // Pusher — notifications arrière-plan (widget fermé)
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`private-patient-${userId}`)
    channel.bind("new-message", () => {
      if (!open) setUnread(n => n + 1)
    })
    return () => { pusher.unsubscribe(`private-patient-${userId}`) }
  }, [userId, open])

  async function createChat() {
    if (!subject.trim()) return
    setCreating(true)
    const res  = await fetch("/api/support-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject }),
    })
    const json = await res.json()
    if (res.ok) { setChat(json.data); setSubject("") }
    setCreating(false)
  }

  async function sendMessage() {
    if (!chat || !newMsg.trim()) return
    const text  = newMsg.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId, content: text,
      senderId: userId, senderRole: "PATIENT", senderName: "Moi",
      createdAt: new Date().toISOString(), isRead: false, isPending: true,
    }
    setMessages(prev => [...prev, optimistic])
    setNewMsg("")
    setTimeout(scrollToBottom, 50)
    setLoading(true)

    try {
      const res  = await fetch(`/api/support-chat/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...json.data, isPending: false } : m))
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false, isFailed: true } : m))
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false, isFailed: true } : m))
    } finally {
      setLoading(false)
    }
  }

  // Groupement des messages (WhatsApp)
  function renderMessages() {
    return messages.map((msg, i) => {
      const prev = messages[i - 1]
      const isFirstInSeries = !prev
        || prev.senderId !== msg.senderId
        || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 2 * 60 * 1000

      const showDateSep = !prev
        || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt))

      const isOwn = msg.senderRole === "PATIENT"

      return (
        <div key={msg.id}>
          {showDateSep && (
            <div className="chat-date-sep">
              <span>{formatDateLabel(msg.createdAt)}</span>
            </div>
          )}
          <MessageBubble
            message={msg}
            isOwn={isOwn}
            isFirstInSeries={isFirstInSeries}
            showSenderName={isFirstInSeries && !isOwn}
          />
        </div>
      )
    })
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) setUnread(0) }}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-300",
          "bg-gradient-to-br from-[#C8906A] to-[#E8B49A]",
          !open && unread > 0 && "animate-gold-pulse"
        )}
        aria-label="Chat support"
      >
        {open
          ? <ChevronDown className="h-6 w-6 text-[#0A0A0A]" />
          : <MessageCircle className="h-6 w-6 text-[#0A0A0A]" />
        }
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E85454] text-[10px] font-bold text-white border-2 border-[#0A0A0A]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panneau */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#0F0F0F] shadow-2xl"
          style={{ width: 360, height: 520 }}>

          {/* Header */}
          <div className="flex items-center gap-3 border-b border-[#2A2A2A] bg-[#141414] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C8906A] to-[#E8B49A]">
              <MessageCircle className="h-4 w-4 text-[#0A0A0A]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-none">Support Mobile Clinic</p>
              <p className="mt-0.5 text-[11px] text-[#4CAF87]">🟢 En ligne</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#555555] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Corps */}
          {!chat ? (
            /* Démarrer une conversation */
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center bg-[#0A0A0A]">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)] border border-[rgba(200,144,106,0.2)]">
                <MessageCircle className="h-7 w-7 text-[#C8906A]" />
              </div>
              <p className="font-semibold text-white">Besoin d&apos;aide ?</p>
              <p className="mt-1 text-xs text-[#555555]">Notre équipe répond rapidement à vos questions.</p>
              <div className="mt-5 w-full">
                <input
                  className="chat-input w-full"
                  placeholder="Sujet de votre question..."
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createChat() }}
                />
                <button onClick={createChat} disabled={!subject.trim() || creating}
                  className="mt-2 w-full rounded-xl bg-[#C8906A] py-2.5 text-sm font-semibold text-[#0A0A0A] hover:bg-[#E8B49A] disabled:opacity-40 transition-colors">
                  {creating ? "Démarrage..." : "Démarrer une conversation"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Zone messages */}
              <div className="chat-messages-zone flex-1">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-[#444444] mt-6">
                    Conversation ouverte — un agent vous répond bientôt.
                  </p>
                )}
                {renderMessages()}
                <div ref={endRef} />
              </div>

              {/* Zone saisie */}
              {chat.isOpen ? (
                <div className="chat-input-zone">
                  <input
                    className="chat-input"
                    placeholder="Écrire un message..."
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    autoComplete="off"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMsg.trim() || loading}
                    style={{
                      width: 36, height: 36, borderRadius: "50%", border: "none", flexShrink: 0,
                      background: newMsg.trim() ? "linear-gradient(135deg,#C8906A,#E8B49A)" : "#1A1A1A",
                      cursor: newMsg.trim() ? "pointer" : "default",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <Send size={14} color={newMsg.trim() ? "#0A0A0A" : "#444444"} />
                  </button>
                </div>
              ) : (
                <div className="border-t border-[#2A2A2A] p-3 text-center text-xs text-[#444444]">
                  Conversation clôturée.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
