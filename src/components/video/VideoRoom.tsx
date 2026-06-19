"use client"

import { useEffect, useRef, useState } from "react"
import { VideoControls } from "./VideoControls"
import { Camera, Mic, MicOff, VideoOff } from "lucide-react"

interface VideoRoomProps {
  roomUrl: string
  token:   string
  onLeave: () => void
}

type PermState = "checking" | "prompt" | "requesting" | "granted" | "denied"

export function VideoRoom({ roomUrl, token, onLeave }: VideoRoomProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [permState, setPermState] = useState<PermState>("checking")

  const src = `${roomUrl}?t=${token}&lang=fr`

  useEffect(() => {
    async function check() {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setPermState("granted")
        return
      }
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ])
        if (cam.state === "denied" || mic.state === "denied") {
          setPermState("denied")
        } else if (cam.state === "granted" && mic.state === "granted") {
          setPermState("granted")
        } else {
          setPermState("prompt")
        }
      } catch {
        setPermState("prompt")
      }
    }
    check()
  }, [])

  async function requestPermissions() {
    setPermState("requesting")
    try {
      // Obtenir la permission puis libérer immédiatement la caméra
      // Daily.co accède à la caméra depuis l'iframe — ne pas la bloquer
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setPermState("granted")
    } catch (err) {
      const name = err instanceof Error ? err.name : ""
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setPermState("granted")
      } else {
        setPermState("denied")
      }
    }
  }

  if (permState === "checking") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm">Connexion à la salle…</p>
        </div>
      </div>
    )
  }

  if (permState === "prompt" || permState === "requesting") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-900 px-6 text-center">
        <div className="mb-6 flex gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Camera className="h-8 w-8 text-white" />
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Mic className="h-8 w-8 text-white" />
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white">
          Autoriser la caméra et le micro
        </h3>
        <p className="mb-8 max-w-xs text-sm text-gray-400">
          Appuyez sur le bouton, puis choisissez <strong className="text-white">Autoriser</strong> quand le navigateur vous le demande.
        </p>
        <button
          onClick={requestPermissions}
          disabled={permState === "requesting"}
          className="w-full max-w-xs rounded-2xl bg-blue-600 py-4 text-base font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {permState === "requesting" ? "En attente de votre réponse…" : "Autoriser caméra & microphone"}
        </button>
        <button
          onClick={() => setPermState("granted")}
          className="mt-4 text-xs text-gray-500 underline"
        >
          Rejoindre sans caméra ni micro
        </button>
      </div>
    )
  }

  if (permState === "denied") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-900 px-6 text-center">
        <div className="mb-5 flex gap-3">
          <VideoOff className="h-9 w-9 text-red-400" />
          <MicOff   className="h-9 w-9 text-red-400" />
        </div>
        <h3 className="mb-2 text-base font-semibold text-white">Accès refusé</h3>
        <p className="mb-5 text-sm text-gray-400">
          La caméra ou le microphone a été bloqué. Pour l&apos;activer :
        </p>
        <div className="mb-6 w-full max-w-xs rounded-2xl bg-white/5 p-5 text-left text-sm text-gray-300 space-y-2">
          <p className="mb-2 font-semibold text-white">Sur Android Chrome</p>
          <p>① Appuyez sur <strong className="text-white">ⓘ</strong> à gauche de l&apos;adresse</p>
          <p>② Appuyez sur <strong className="text-white">Autorisations du site</strong></p>
          <p>③ Activez <strong className="text-white">Caméra</strong> et <strong className="text-white">Microphone</strong></p>
          <p>④ Rechargez la page et revenez</p>
        </div>
        <button
          onClick={requestPermissions}
          className="w-full max-w-xs rounded-2xl bg-blue-600 py-4 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Réessayer
        </button>
        <button
          onClick={() => setPermState("granted")}
          className="mt-3 text-xs text-gray-500 underline"
        >
          Rejoindre sans caméra
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col bg-gray-900">
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera *; microphone *; fullscreen *; display-capture *; autoplay *"
        allowFullScreen
        className="flex-1 w-full border-0"
        title="Consultation vidéo Mobile Clinic"
      />
      <VideoControls onLeave={onLeave} />
    </div>
  )
}
