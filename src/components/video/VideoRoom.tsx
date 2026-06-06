"use client"

import { useEffect, useRef, useState } from "react"
import { VideoControls } from "./VideoControls"

interface VideoRoomProps {
  roomUrl:   string
  token:     string
  onLeave:   () => void
}

export function VideoRoom({ roomUrl, token, onLeave }: VideoRoomProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)

  // Daily.co via iframe (compatible avec SSR Next.js)
  // La salle est détruite automatiquement 60 min après le début
  const src = `${roomUrl}?t=${token}`

  useEffect(() => {
    setIsReady(true)
    return () => {
      // Nettoyage côté client
    }
  }, [])

  if (!isReady) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p>Connexion à la salle vidéo…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-gray-900">
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full border-0"
        title="Consultation vidéo Mobile Clinic"
      />
      <VideoControls onLeave={onLeave} />
    </div>
  )
}
