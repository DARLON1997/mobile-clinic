"use client"

// TODO: connecter à un futur système d'actualités santé en base de données

import Link from "next/link"

const NEWS_ITEMS = [
  { id: 1, emoji: "💊", label: "Nouveaux\nmédicaments",     href: "/patient/pharmacie"      },
  { id: 2, emoji: "🩺", label: "Conseils\nprévention",      href: "/patient/book"           },
  { id: 3, emoji: "📰", label: "Actu\nMobile Clinic",       href: "/patient"               },
  { id: 4, emoji: "🔬", label: "Suivi\nlaboratoire",        href: "/patient/lab-exams"      },
  { id: 5, emoji: "🎉", label: "Offres\ndu moment",         href: "/patient/pharmacie"      },
  { id: 6, emoji: "🏥", label: "Soins\nproche de vous",     href: "/patient/presentiel"     },
]

export function HealthNews() {
  return (
    <div className="mb-5">
      {/* Titre */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-bold text-white">
          <span style={{ color: "#C8906A" }}>⭐</span> Actualités santé
        </p>
        <Link href="/patient">
          <span
            className="text-[12px] font-medium transition-opacity active:opacity-60"
            style={{ color: "#C8906A" }}
          >
            + Voir tout
          </span>
        </Link>
      </div>

      {/* Scroll horizontal */}
      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{
          scrollbarWidth:    "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {NEWS_ITEMS.map((item) => (
          <Link key={item.id} href={item.href} className="shrink-0">
            <div className="flex flex-col items-center gap-2">
              {/* Cercle icône */}
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-transform active:scale-90"
                style={{
                  background: "linear-gradient(135deg, #1E1E1E, #141414)",
                  border:     "1px solid #2A2A2A",
                }}
              >
                {item.emoji}
              </div>
              {/* Label */}
              <span
                className="w-16 text-center whitespace-pre-line leading-tight text-[10px] font-medium"
                style={{ color: "#AAAAAA" }}
              >
                {item.label}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
