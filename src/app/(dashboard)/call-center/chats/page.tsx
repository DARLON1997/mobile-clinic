"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MessageCircle, Send, UserCheck, X } from "lucide-react"
import { cn, getInitials, formatRelativeTime, isSameDay, formatDateLabel } from "@/lib/utils"
import { getPusherClient } from "@/lib/pusher-client"
import { playNotificationSound } from "@/lib/chat-notifications"
import { MessageBubble, type ChatMessage } from "@/components/chat/MessageBubble"

type Chat = {
  id:            string
  subject:       string
  isOpen:        boolean
  lastMessageAt: string
  callCenterId:  string | null
  patient: {
    email:          string
    patientProfile: { firstName: string; lastName: string } | null
  }
  messages: { content: string; createdAt: string }[]
}

function patientName(chat: Chat) {
  if (chat.patient.patientProfile) {
    return `${chat.patient.patientProfile.firstName} ${chat.patient.patientProfile.lastName}`
  }
  return chat.patient.email
}

const QUICK = [
  "Bonjour, comment puis-je vous aider ?",
  "Votre demande est bien prise en compte.",
  "Un agent vous contactera sous peu.",
  "Y a-t-il autre chose pour vous ?",
]

export default function CallCenterChatsPage() {
  const [chats,    setChats]    = useState<Chat[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMsg,   setNewMsg]   = useState("")
  const [filter,   setFilter]   = useState<"all" | "open" | "mine" | "closed">("open")
  const [loading,  setLoading]  = useState(false)
  const [unread,   setUnread]   = useState<Record<string, number>>({})
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const activeChat = chats.find(c => c.id === activeId) ?? null

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Charger les conversations
  useEffect(() => {
    fetch("/api/support-chat")
      .then(r => r.json())
      .then(j => setChats(j.data ?? []))
  }, [])

  // Charger les messages de la conversation active
  useEffect(() => {
    if (!activeId) return
    fetch(`/api/support-chat/${activeId}/messages`)
      .then(r => r.json())
      .then(j => {
        setMessages(j.data ?? [])
        setUnread(prev => ({ ...prev, [activeId]: 0 }))
        setTimeout(scrollToBottom, 50)
      })
  }, [activeId, scrollToBottom])

  // Pusher — canal conversation active
  useEffect(() => {
    if (!activeId) return
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe(`chat-${activeId}`)
    ch.bind("new-message", (msg: ChatMessage) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(scrollToBottom, 50)
    })
    return () => { pusher.unsubscribe(`chat-${activeId}`) }
  }, [activeId, scrollToBottom])

  // Pusher — boîte de réception globale
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) return
    const ch = pusher.subscribe("call-center-inbox")

    ch.bind("new-message", (data: { chatId: string; preview: string; timestamp: string }) => {
      setChats(prev => {
        const updated = prev.map(c => c.id === data.chatId
          ? { ...c, lastMessageAt: data.timestamp, messages: [{ content: data.preview, createdAt: data.timestamp }] }
          : c
        )
        return [...updated].sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        )
      })
      if (data.chatId !== activeId) {
        setUnread(prev => ({ ...prev, [data.chatId]: (prev[data.chatId] ?? 0) + 1 }))
        playNotificationSound()
      }
    })

    ch.bind("new-conversation", () => {
      fetch("/api/support-chat").then(r => r.json()).then(j => setChats(j.data ?? []))
      playNotificationSound()
    })

    return () => { pusher.unsubscribe("call-center-inbox") }
  }, [activeId])

  async function sendMessage(content: string) {
    if (!activeId || !content.trim()) return
    const text   = content.trim()
    const tempId = `temp-${Date.now()}`
    const optimistic: ChatMessage = {
      id: tempId, content: text,
      senderId: "agent", senderRole: "CALL_CENTER_AGENT", senderName: "Agent Support",
      createdAt: new Date().toISOString(), isRead: false, isPending: true,
    }
    setMessages(prev => [...prev, optimistic])
    setNewMsg("")
    setSendError(null)
    setTimeout(scrollToBottom, 50)
    setLoading(true)
    try {
      const res  = await fetch(`/api/support-chat/${activeId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      })
      let json: { success?: boolean; data?: ChatMessage; error?: string } = {}
      try { json = await res.json() } catch { json = {} }
      if (!res.ok) {
        setSendError(`HTTP ${res.status} — ${json.error ?? JSON.stringify(json)}`)
      }
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? res.ok && json.data
            ? { ...json.data, isPending: false }
            : { ...m, isPending: false, isFailed: true }
          : m
      ))
    } catch (err) {
      setSendError(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`)
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false, isFailed: true } : m))
    } finally {
      setLoading(false)
    }
  }

  async function takeOver() {
    if (!activeId) return
    const res = await fetch(`/api/support-chat/${activeId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ takeOver: true }),
    })
    if (res.ok) {
      setChats(prev => prev.map(c => c.id === activeId ? { ...c, callCenterId: "me" } : c))
    }
  }

  async function closeChat() {
    if (!activeId) return
    await fetch(`/api/support-chat/${activeId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: false }),
    })
    setChats(prev => prev.map(c => c.id === activeId ? { ...c, isOpen: false } : c))
    setActiveId(null)
    setMessages([])
  }

  const filtered = chats.filter(c => {
    if (filter === "open")   return c.isOpen && !c.callCenterId
    if (filter === "mine")   return c.isOpen && !!c.callCenterId
    if (filter === "closed") return !c.isOpen
    return true
  })

  function renderMessages() {
    return messages.map((msg, i) => {
      const prev            = messages[i - 1]
      const isFirstInSeries = !prev
        || prev.senderId !== msg.senderId
        || (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime()) > 2 * 60 * 1000
      const showDateSep = !prev || !isSameDay(new Date(msg.createdAt), new Date(prev.createdAt))
      const isOwn       = msg.senderRole !== "PATIENT"
      return (
        <div key={msg.id}>
          {showDateSep && (
            <div className="chat-date-sep"><span>{formatDateLabel(msg.createdAt)}</span></div>
          )}
          <MessageBubble
            message={msg} isOwn={isOwn}
            isFirstInSeries={isFirstInSeries}
            showSenderName={isFirstInSeries && !isOwn}
          />
        </div>
      )
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">

      {/* Colonne gauche */}
      <div className="flex w-72 flex-col border-r border-[#2A2A2A]">
        <div className="border-b border-[#2A2A2A] p-4">
          <h2 className="font-semibold text-white">Conversations</h2>
          <div className="mt-2.5 flex gap-1 flex-wrap">
            {(["all", "open", "mine", "closed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  filter === f ? "bg-[#C8906A] text-[#0A0A0A]" : "bg-[#1A1A1A] text-[#666666] hover:text-[#AAAAAA]"
                )}>
                {{ all: "Toutes", open: "Nouvelles", mine: "Les miennes", closed: "Fermées" }[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-xs text-[#444444]">Aucune conversation</p>
          )}
          {filtered.map(chat => {
            const name    = patientName(chat)
            const badge   = unread[chat.id] ?? 0
            const preview = chat.messages[0]?.content ?? chat.subject
            return (
              <div key={chat.id}
                className={cn("conv-item", chat.id === activeId && "active", badge > 0 && "unread")}
                onClick={() => setActiveId(chat.id)}
              >
                <div className="conv-avatar">{getInitials(name)}</div>
                <div className="conv-info">
                  <div className="conv-name">{name}</div>
                  <div className="conv-preview">{preview}</div>
                </div>
                <div className="conv-meta">
                  <span className="conv-time">{formatRelativeTime(chat.lastMessageAt)}</span>
                  {badge > 0
                    ? <span className="conv-badge">{badge > 99 ? "99+" : badge}</span>
                    : !chat.callCenterId && chat.isOpen
                      ? <span className="rounded-full bg-[rgba(232,168,56,0.15)] px-1.5 py-0.5 text-[9px] font-semibold text-[#E8A838]">NOUVEAU</span>
                      : null
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Colonne droite */}
      {activeChat ? (
        <div className="flex flex-1 flex-col">
          {/* En-tête */}
          <div className="flex items-center justify-between border-b border-[#2A2A2A] bg-[#141414] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#C8906A] to-[#E8B49A] text-sm font-bold text-[#0A0A0A]">
                {getInitials(patientName(activeChat))}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{patientName(activeChat)}</p>
                <p className="text-xs text-[#555555]">{activeChat.subject}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!activeChat.callCenterId && activeChat.isOpen && (
                <button onClick={takeOver}
                  className="flex items-center gap-1.5 rounded-lg bg-[#C8906A] px-3 py-1.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#E8B49A] transition-colors">
                  <UserCheck className="h-3 w-3" /> Prendre en charge
                </button>
              )}
              {activeChat.isOpen && (
                <button onClick={closeChat}
                  className="flex items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-[#666666] hover:text-white hover:border-[#444444] transition-colors">
                  <X className="h-3 w-3" /> Clôturer
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages-zone flex-1">
            {messages.length === 0 && (
              <p className="mt-6 text-center text-xs text-[#444444]">Aucun message.</p>
            )}
            {renderMessages()}
            <div ref={endRef} />
          </div>

          {/* Erreur d'envoi — debug temporaire */}
          {sendError && (
            <div className="border-t border-red-900/40 bg-red-950/60 px-4 py-2 text-xs font-mono text-red-300">
              {sendError}
            </div>
          )}

          {/* Réponses rapides */}
          {activeChat.isOpen && (
            <div className="flex gap-2 overflow-x-auto border-t border-[#1A1A1A] px-4 py-2">
              {QUICK.map(r => (
                <button key={r} onClick={() => sendMessage(r)}
                  className="shrink-0 rounded-full border border-[#2A2A2A] px-3 py-1 text-[11px] text-[#666666] hover:border-[#C8906A] hover:text-[#C8906A] transition-colors">
                  {r.length > 28 ? r.slice(0, 28) + "…" : r}
                </button>
              ))}
            </div>
          )}

          {/* Saisie */}
          {activeChat.isOpen ? (
            <div className="chat-input-zone">
              <input
                className="chat-input"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(newMsg) } }}
                placeholder="Votre message..."
                autoComplete="off"
              />
              <button
                onClick={() => sendMessage(newMsg)}
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
            <div className="border-t border-[#2A2A2A] p-4 text-center text-xs text-[#444444]">
              Cette conversation est clôturée.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(200,144,106,0.08)] border border-[rgba(200,144,106,0.15)]">
              <MessageCircle className="h-7 w-7 text-[#C8906A]" />
            </div>
            <p className="text-sm font-medium text-[#AAAAAA]">Sélectionnez une conversation</p>
            <p className="mt-1 text-xs text-[#444444]">Les messages apparaissent ici</p>
          </div>
        </div>
      )}
    </div>
  )
}
