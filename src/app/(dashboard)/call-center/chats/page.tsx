"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { MessageCircle, Send, UserCheck, X } from "lucide-react"

type Message = {
  id: string; content: string; createdAt: string; isRead: boolean
  sender: { email: string; role: string }
}

type Chat = {
  id: string; subject: string; isOpen: boolean; lastMessageAt: string
  callCenterId: string | null
  patient: { email: string; patientProfile: { firstName: string; lastName: string } | null }
  messages: Message[]
}

const QUICK_REPLIES = [
  "Bonjour, comment puis-je vous aider ?",
  "Votre demande a bien été prise en compte.",
  "Un agent vous contactera sous peu.",
  "Y a-t-il autre chose que je puisse faire pour vous ?",
]

export default function CallCenterChatsPage() {
  const [chats,         setChats]        = useState<Chat[]>([])
  const [activeChat,    setActiveChat]   = useState<Chat | null>(null)
  const [messages,      setMessages]     = useState<Message[]>([])
  const [newMsg,        setNewMsg]       = useState("")
  const [filter,        setFilter]       = useState<"all" | "open" | "mine" | "closed">("open")
  const [loading,       setLoading]      = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/support-chat").then(r => r.json()).then(j => setChats(j.data ?? []))
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function openChat(chat: Chat) {
    setActiveChat(chat)
    const res = await fetch(`/api/support-chat/${chat.id}/messages`)
    const json = await res.json()
    setMessages(json.data ?? [])
  }

  async function sendMessage(content: string) {
    if (!activeChat || !content.trim()) return
    setLoading(true)
    const res = await fetch(`/api/support-chat/${activeChat.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessages(prev => [...prev, json.data])
      setNewMsg("")
    }
    setLoading(false)
  }

  async function takeOver() {
    if (!activeChat) return
    await fetch(`/api/support-chat/${activeChat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callCenterId: "self" }),
    })
    const updated = { ...activeChat, callCenterId: "self" }
    setActiveChat(updated)
    setChats(prev => prev.map(c => c.id === activeChat.id ? updated : c))
  }

  async function closeChat() {
    if (!activeChat) return
    await fetch(`/api/support-chat/${activeChat.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: false }),
    })
    setActiveChat(null)
    setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, isOpen: false } : c))
  }

  const filtered = chats.filter(c => {
    if (filter === "open")   return c.isOpen && !c.callCenterId
    if (filter === "mine")   return c.isOpen && !!c.callCenterId
    if (filter === "closed") return !c.isOpen
    return true
  })

  function patientName(chat: Chat) {
    if (chat.patient.patientProfile) {
      return `${chat.patient.patientProfile.firstName} ${chat.patient.patientProfile.lastName}`
    }
    return chat.patient.email
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Colonne gauche */}
      <div className="flex w-80 flex-col border-r border-gray-100">
        <div className="border-b border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <div className="mt-2 flex gap-1 flex-wrap">
            {(["all","open","mine","closed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
                  filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}>
                {{all:"Toutes", open:"Non assignées", mine:"Les miennes", closed:"Fermées"}[f]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">Aucune conversation</p>
          )}
          {filtered.map(chat => (
            <button key={chat.id} onClick={() => openChat(chat)}
              className={cn("w-full border-b border-gray-50 p-4 text-left hover:bg-gray-50 transition-colors",
                activeChat?.id === chat.id && "bg-blue-50"
              )}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{patientName(chat)}</p>
                  <p className="truncate text-xs text-gray-500">{chat.subject}</p>
                  {chat.messages[0] && (
                    <p className="truncate text-xs text-gray-400 mt-0.5">{chat.messages[0].content}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400">
                    {new Date(chat.lastMessageAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {!chat.callCenterId && chat.isOpen && (
                    <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                      Non assigné
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Colonne droite */}
      {activeChat ? (
        <div className="flex flex-1 flex-col">
          {/* En-tête conversation */}
          <div className="flex items-center justify-between border-b border-gray-100 p-4">
            <div>
              <p className="font-semibold text-gray-900">{patientName(activeChat)}</p>
              <p className="text-xs text-gray-500">{activeChat.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              {!activeChat.callCenterId && activeChat.isOpen && (
                <button onClick={takeOver}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
                  <UserCheck className="h-3 w-3" /> Prendre en charge
                </button>
              )}
              {activeChat.isOpen && (
                <button onClick={closeChat}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
                  <X className="h-3 w-3" /> Clôturer
                </button>
              )}
            </div>
          </div>

          {/* Zone messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => {
              const isAgent = msg.sender.role !== "PATIENT"
              return (
                <div key={msg.id} className={cn("flex", isAgent ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-xs rounded-2xl px-4 py-2 text-sm",
                    isAgent
                      ? "rounded-br-sm bg-blue-600 text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-800"
                  )}>
                    <p>{msg.content}</p>
                    <p className={cn("mt-1 text-[10px]", isAgent ? "text-blue-200" : "text-gray-400")}>
                      {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Réponses rapides */}
          {activeChat.isOpen && (
            <div className="flex gap-2 overflow-x-auto px-4 py-2 border-t border-gray-50">
              {QUICK_REPLIES.map(r => (
                <button key={r} onClick={() => sendMessage(r)}
                  className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:border-blue-300">
                  {r.length > 30 ? r.slice(0, 30) + "…" : r}
                </button>
              ))}
            </div>
          )}

          {/* Zone saisie */}
          {activeChat.isOpen ? (
            <div className="flex items-center gap-2 border-t border-gray-100 p-4">
              <input
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(newMsg) } }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm focus:border-blue-400 focus:outline-none"
                placeholder="Votre message..."
              />
              <button onClick={() => sendMessage(newMsg)} disabled={!newMsg.trim() || loading}
                className="rounded-xl bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-4 text-center text-sm text-gray-400">
              Cette conversation est clôturée.
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="font-medium text-gray-400">Sélectionnez une conversation</p>
          </div>
        </div>
      )}
    </div>
  )
}
