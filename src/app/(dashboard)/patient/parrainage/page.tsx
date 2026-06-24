"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Copy, Check, Share2, Gift, Users, TrendingUp, Clock } from "lucide-react"

type DirectReferral = {
  id:         string
  firstName:  string
  lastName:   string
  referredAt: string | null
  activated:  boolean
}

type Transaction = {
  id:              string
  level:           number
  pointsAwarded:   number
  createdAt:       string
  triggeredByName: string
}

type ReferralData = {
  referralCode:       string | null
  totalPoints:        number
  directReferrals:    DirectReferral[]
  recentTransactions: Transaction[]
}

export default function ParrainagePage() {
  const [copied, setCopied] = useState(false)

  const { data, isLoading: loading } = useQuery<ReferralData | null>({
    queryKey: ["patient-referral"],
    queryFn:  () => fetch("/api/patient/referral").then(r => r.json()),
  })

  function copyCode() {
    if (!data?.referralCode) return
    navigator.clipboard.writeText(data.referralCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    if (!data?.referralCode) return
    const msg = encodeURIComponent(
      `Rejoins Mobile Clinic pour consulter un médecin sans te déplacer ! 🏥\nUtilise mon code de parrainage : *${data.referralCode}*\nhttps://mobile-clinic.vercel.app/register`
    )
    window.open(`https://wa.me/?text=${msg}`, "_blank")
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C8906A] border-t-transparent" />
      </div>
    )
  }

  const activatedCount = data?.directReferrals.filter((r) => r.activated).length ?? 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div>
        <h1 className="font-heading text-2xl text-white">Parrainage</h1>
        <p className="mt-1 text-sm text-[#666666]">Invitez vos proches et gagnez des points à chaque activation.</p>
      </div>

      {/* Carte code + points */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{ background: "linear-gradient(135deg, #1A1000 0%, #2A1A08 50%, #1A0A00 100%)" }}
      >
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 70% 30%, #C8906A 0%, transparent 60%)" }} />

        <div className="relative z-10">
          <div className="mb-4 flex items-center gap-2 text-[#C8906A]">
            <Gift className="h-5 w-5" />
            <span className="font-montserrat text-xs font-semibold uppercase tracking-widest">Mon code de parrainage</span>
          </div>

          {data?.referralCode ? (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className="font-mono text-3xl font-bold tracking-widest text-white">
                  {data.referralCode}
                </span>
                <button
                  onClick={copyCode}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition-colors hover:bg-white/20"
                  title="Copier le code"
                >
                  {copied ? <Check className="h-4 w-4 text-[#4CAF87]" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow transition-opacity active:opacity-75"
              >
                <Share2 className="h-4 w-4" />
                Partager sur WhatsApp
              </button>
            </>
          ) : (
            <p className="text-sm text-[#AAAAAA]">Code de parrainage non disponible pour ce compte.</p>
          )}

          <div className="mt-5 flex items-end gap-1">
            <span className="font-heading text-4xl font-bold text-[#C8906A]">
              {(data?.totalPoints ?? 0).toFixed(2)}
            </span>
            <span className="mb-1 text-sm text-[#AAAAAA]">points</span>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
          <div className="mb-1 flex items-center gap-2 text-[#666666]">
            <Users className="h-4 w-4" />
            <span className="text-xs">Filleuls directs</span>
          </div>
          <p className="text-2xl font-bold text-white">{data?.directReferrals.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-4">
          <div className="mb-1 flex items-center gap-2 text-[#666666]">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Activés</span>
          </div>
          <p className="text-2xl font-bold text-[#4CAF87]">{activatedCount}</p>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Comment ça marche ?</h2>
        <div className="space-y-3">
          {[
            { step: "1", text: "Partagez votre code unique avec vos proches" },
            { step: "2", text: "Ils s'inscrivent en entrant votre code" },
            { step: "3", text: "À leur 1ère connexion, vous gagnez 1 point automatiquement" },
            { step: "4", text: "Leurs filleuls vous rapportent 0,5 point, puis 0,25, jusqu'à 10 niveaux" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(200,144,106,0.15)] text-xs font-bold text-[#C8906A]">
                {step}
              </div>
              <p className="text-sm text-[#AAAAAA]">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filleuls directs */}
      {(data?.directReferrals.length ?? 0) > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Mes filleuls directs</h2>
          <div className="space-y-2">
            {data!.directReferrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-[#1A1A1A] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-white">{r.firstName} {r.lastName}</p>
                  {r.referredAt && (
                    <p className="text-xs text-[#666666]">
                      Inscrit le {new Date(r.referredAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  r.activated
                    ? "bg-[rgba(76,175,135,0.12)] text-[#4CAF87]"
                    : "bg-[rgba(100,100,100,0.12)] text-[#666666]"
                }`}>
                  {r.activated ? "Actif" : "En attente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historique des points */}
      {(data?.recentTransactions.length ?? 0) > 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Historique des points</h2>
          <div className="space-y-2">
            {data!.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-[#1A1A1A] px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(200,144,106,0.1)]">
                    <Clock className="h-3.5 w-3.5 text-[#C8906A]" />
                  </div>
                  <div>
                    <p className="text-sm text-white">
                      Niveau {t.level} — {t.triggeredByName}
                    </p>
                    <p className="text-xs text-[#666666]">
                      {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm font-bold text-[#C8906A]">
                  +{t.pointsAwarded % 1 === 0 ? t.pointsAwarded.toFixed(0) : t.pointsAwarded.toFixed(3).replace(/0+$/, "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {(data?.directReferrals.length ?? 0) === 0 && (data?.recentTransactions.length ?? 0) === 0 && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#141414] p-8 text-center">
          <Gift className="mx-auto mb-3 h-10 w-10 text-[#333333]" />
          <p className="text-sm text-[#666666]">Vous n'avez pas encore de filleuls.</p>
          <p className="mt-1 text-xs text-[#444444]">Partagez votre code pour commencer à gagner des points !</p>
        </div>
      )}
    </div>
  )
}
