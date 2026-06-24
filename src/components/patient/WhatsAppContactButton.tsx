"use client"

import { MessageCircle } from "lucide-react"
import { buildWhatsAppLink } from "@/lib/contact-constants"

// Message pré-rempli dans la barre de saisie du patient à l'ouverture de WhatsApp.
// Le patient n'a qu'à appuyer sur "Envoyer" pour initier la conversation.
const WHATSAPP_MESSAGE = "Bonjour, qu'est-ce qu'on peut faire pour vous ?"

export function WhatsAppContactButton() {
  const link = buildWhatsAppLink(WHATSAPP_MESSAGE)

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter le Call Center sur WhatsApp"
      className="fixed right-4 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-transform active:scale-95"
      style={{
        bottom:     80,                                    /* au-dessus de la BottomNav (64px) + 16px */
        background: "linear-gradient(135deg, #25D366, #1FAF54)",
        boxShadow:  "0 4px 16px rgba(37,211,102,0.40)",
      }}
    >
      <MessageCircle size={22} strokeWidth={2} />
    </a>
  )
}
