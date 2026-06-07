"use client"

import { cn } from "@/lib/utils"

export type ChatMessage = {
  id:          string
  content:     string
  senderId:    string
  senderRole:  string
  senderName:  string
  createdAt:   string | Date
  isRead:      boolean
  fileUrl?:    string | null
  isPending?:  boolean
  isFailed?:   boolean
}

interface Props {
  message:         ChatMessage
  isOwn:           boolean
  isFirstInSeries: boolean
  showSenderName:  boolean
}

function fmt(d: string | Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(d))
}

export function MessageBubble({ message, isOwn, isFirstInSeries, showSenderName }: Props) {
  return (
    <div className={cn("flex items-end gap-1.5", isOwn ? "justify-end" : "justify-start")}>
      {/* Avatar reçu */}
      {!isOwn && (
        <div className={cn("h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold text-[#0A0A0A]",
          isFirstInSeries
            ? "bg-gradient-to-br from-[#C8906A] to-[#E8B49A]"
            : "invisible"
        )}>
          {message.senderName.charAt(0).toUpperCase()}
        </div>
      )}

      <div className={cn("flex flex-col gap-0.5", isOwn ? "items-end" : "items-start", "max-w-[75%]")}>
        {showSenderName && (
          <span className="text-[10px] font-semibold text-[#C8906A] ml-1">
            {message.senderName}
          </span>
        )}

        <div className={cn(
          "px-3 py-2 text-sm leading-relaxed break-words",
          isOwn
            ? cn(
                "bg-gradient-to-br from-[rgba(200,144,106,0.28)] to-[rgba(200,144,106,0.16)] border border-[rgba(200,144,106,0.32)] text-white",
                isFirstInSeries ? "rounded-[12px_2px_12px_12px]" : "rounded-[12px_4px_4px_12px]"
              )
            : cn(
                "bg-[#2A2420] text-white",
                isFirstInSeries ? "rounded-[2px_12px_12px_12px]" : "rounded-[4px_12px_12px_4px]"
              ),
          message.isPending && "opacity-50",
          message.isFailed  && "!border-red-500/50"
        )}>
          <p>{message.content}</p>

          {message.fileUrl && (
            <a href={message.fileUrl} target="_blank" rel="noreferrer"
               className="mt-1.5 flex items-center gap-1 text-[#C8906A] text-xs hover:underline">
              📎 Pièce jointe
            </a>
          )}

          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-white/35">
              {fmt(message.createdAt)}
              {message.isPending && " ⏳"}
              {message.isFailed  && " ⚠️"}
            </span>
            {isOwn && !message.isPending && !message.isFailed && (
              <span className={cn("text-[10px]", message.isRead ? "text-blue-400" : "text-white/35")}>
                {message.isRead ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
