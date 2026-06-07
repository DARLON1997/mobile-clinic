"use client"

import { useState, useEffect, useRef } from "react"
import { MessageCircle, X, Send, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Message = {
  id: string; content: string; createdAt: string
  sender: { email: string; role: string }
}

type Chat = { id: string; subject: string; isOpen: boolean }

export function PatientChatWidget() {
  const [open,       setOpen]      = useState(false)
  const [chat,       setChat]      = useState<Chat | null>(null)
  const [messages,   setMessages]  = useState<Message[]>([])
  const [newMsg,     setNewMsg]    = useState("")
  const [subject,    setSubject]   = useState("")
  const [unread,     setUnread]    = useState(0)
  const [loading,    setLoading]   = useState(false)
  const [creating,   setCreating]  = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/support-chat")
      .then(r => r.json())
      .then(j => {
        const chats: Chat[] = j.data ?? []
        const openChat = chats.find(c => c.isOpen)
        if (openChat) setChat(openChat)
      })
  }, [])

  useEffect(() => {
    if (chat && open) loadMessages()
  }, [chat, open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function loadMessages() {
    if (!chat) return
    const res = await fetch(`/api/support-chat/${chat.id}/messages`)
    const json = await res.json()
    setMessages(json.data ?? [])
    setUnread(0)
  }

  async function createChat() {
    if (!subject.trim()) return
    setCreating(true)
    const res = await fetch("/api/support-chat", {
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
    setLoading(true)
    const res = await fetch(`/api/support-chat/${chat.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMsg }),
    })
    const json = await res.json()
    if (res.ok) { setMessages(prev => [...prev, json.data]); setNewMsg("") }
    setLoading(false)
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => { setOpen(o => !o); if (!open && chat) loadMessages() }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
        aria-label="Chat support"
      >
        {open ? <ChevronDown className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Panneau chat */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          style={{ height: 460 }}>
          {/* En-tête */}
          <div className="flex items-center justify-between bg-blue-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">Support Mobile Clinic</p>
                <p className="text-[11px] text-blue-200">🟢 En ligne</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Corps */}
          {!chat ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <MessageCircle className="mb-3 h-12 w-12 text-gray-200" />
              <p className="font-semibold text-gray-700">Besoin d&apos;aide ?</p>
              <p className="mt-1 text-xs text-gray-400">Notre équipe est disponible pour répondre à vos questions.</p>
              <div className="mt-4 w-full">
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createChat() }}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  placeholder="Sujet de votre question..."
                />
                <button onClick={createChat} disabled={!subject.trim() || creating}
                  className="mt-2 w-full rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {creating ? "Démarrage..." : "Démarrer une conversation"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-gray-400 mt-4">Conversation ouverte. Un agent vous répondra bientôt.</p>
                )}
                {messages.map(msg => {
                  const isMe = msg.sender.role === "PATIENT"
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[220px] rounded-2xl px-3 py-2 text-xs",
                        isMe
                          ? "rounded-br-sm bg-blue-600 text-white"
                          : "rounded-bl-sm bg-gray-100 text-gray-800"
                      )}>
                        <p>{msg.content}</p>
                        <p className={cn("mt-0.5 text-[10px]", isMe ? "text-blue-200" : "text-gray-400")}>
                          {new Date(msg.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Saisie */}
              {chat.isOpen ? (
                <div className="flex items-center gap-2 border-t border-gray-100 p-3">
                  <input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") sendMessage() }}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
                    placeholder="Votre message..."
                  />
                  <button onClick={sendMessage} disabled={!newMsg.trim() || loading}
                    className="rounded-xl bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50">
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-100 p-3 text-center text-xs text-gray-400">
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
