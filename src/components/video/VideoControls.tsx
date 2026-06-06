"use client"

import { useState } from "react"
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoControlsProps {
  onLeave: () => void
}

export function VideoControls({ onLeave }: VideoControlsProps) {
  const [micOn,   setMicOn]   = useState(true)
  const [videoOn, setVideoOn] = useState(true)

  return (
    <div className="flex items-center justify-center gap-4 border-t border-white/10 bg-gray-800 p-4">
      <button
        onClick={() => setMicOn(!micOn)}
        className={`rounded-full p-3 transition-colors ${
          micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white"
        }`}
        aria-label={micOn ? "Couper le micro" : "Activer le micro"}
      >
        {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      <button
        onClick={() => setVideoOn(!videoOn)}
        className={`rounded-full p-3 transition-colors ${
          videoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-600 text-white"
        }`}
        aria-label={videoOn ? "Couper la caméra" : "Activer la caméra"}
      >
        {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </button>

      <Button
        variant="danger"
        size="lg"
        onClick={onLeave}
        className="gap-2 rounded-full px-6"
      >
        <PhoneOff className="h-5 w-5" />
        Quitter
      </Button>
    </div>
  )
}
