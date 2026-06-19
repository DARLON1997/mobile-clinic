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
  const iframeRef  = useRef<HTMLIFrameElement>(null)
  const [permState, setPermState] = useState<PermState>("checking")

  const src = `${roomUrl}?t=${token}`

  // Vérifier si les permissions sont déjà accordées au chargement
  useEffect(() => {
    async function check() {
      if (!navigator.mediaDevices?.getUserMedia) {
        // API non disponible (HTTP sans HTTPS, vieux navigateur) → charger quand même
        setPermState("granted")
        return
      }
      try {
        const [cam, mic] = await Promise.all([
          navigator.permissions.query({ name: "camera" as PermissionName }),
          navigator.permissions.query({ name: "microphone" as PermissionName }),
        ])
        if (cam.state === "granted" && mic.state === "granted") {
          setPermState("granted")
        } else if (cam.state === "denied" || mic.state === "denied") {
          setPermState("denied")
        } else {
          setPermState("prompt")
        }
      } catch {
        // Permissions API non supportée → afficher l'écran de demande
        setPermState("prompt")
      }
    }
    check()
  }, [])

  async function requestPermissions() {
    setPermState("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      // Libérer immédiatement — Daily.co reprend la main dans l'iframe
      stream.getTracks().forEach((t) => t.stop())
      setPermState("granted")
    } catch (err) {
      const name = err instanceof Error ? err.name : ""
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        // Pas de caméra physique → laisser Daily.co gérer
        setPermState("granted")
      } else {
        setPermState("denied")
      }
    }
  }

  // Chargement initial
  if (permState === "checking") {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm">Vérification des permissions…</p>
        </div>
      </div>
    )
  }

  // Demande de permissions (état initial ou après réessai)
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
          Appuyez sur le bouton ci-dessous. Votre navigateur va afficher une demande — choisissez <strong className="text-white">Autoriser</strong>.
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

  // Permissions refusées
  if (permState === "denied") {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-gray-900 px-6 text-center">
        <div className="mb-5 flex gap-3">
          <VideoOff className="h-9 w-9 text-red-400" />
          <MicOff  className="h-9 w-9 text-red-400" />
        </div>

        <h3 className="mb-2 text-base font-semibold text-white">Accès refusé</h3>
        <p className="mb-5 text-sm text-gray-400">
          La caméra ou le microphone a été bloqué. Voici comment l&apos;activer :
        </p>

        <div className="mb-6 w-full max-w-xs rounded-2xl bg-white/5 p-5 text-left text-sm text-gray-300 space-y-2">
          <p className="mb-3 font-semibold text-white text-base">Sur Android (Chrome)</p>
          <p>① Appuyez sur <strong className="text-white">ⓘ</strong> ou <strong className="text-white">🔒</strong> à gauche de l&apos;adresse</p>
          <p>② Sélectionnez <strong className="text-white">Autorisations du site</strong></p>
          <p>③ Activez <strong className="text-white">Caméra</strong> et <strong className="text-white">Microphone</strong></p>
          <p>④ Rechargez la page et réessayez</p>
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

  // Permissions accordées → charger l'iframe Daily.co
  return (
    <div className="relative flex h-full flex-col bg-gray-900">
      <iframe
        ref={iframeRef}
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        allowFullScreen
        className="flex-1 w-full border-0"
        title="Consultation vidéo Mobile Clinic"
      />
      <VideoControls onLeave={onLeave} />
    </div>
  )
}
