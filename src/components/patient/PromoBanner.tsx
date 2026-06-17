"use client"

// TODO: connecter à une table PromoBanner future pour permettre
// à l'admin de gérer les bannières sans toucher au code

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"

const SLIDES = [
  {
    id:     1,
    badge:  "Disponible 24h/24",
    title:  "Consultez un médecin\nen 5 minutes",
    cta:    "Consulter maintenant",
    href:   "/patient/book",
    icon:   "🎥",
    color:  "#C8906A",
  },
  {
    id:     2,
    badge:  "Certifiés Mobile Clinic",
    title:  "Soins à domicile\ndisponibles",
    cta:    "Réserver",
    href:   "/patient/home-visit",
    icon:   "🏠",
    color:  "#4A9A7A",
  },
  {
    id:     3,
    badge:  "Nouveau service",
    title:  "Consultations\nen présentiel",
    cta:    "Découvrir",
    href:   "/patient/presentiel",
    icon:   "🏥",
    color:  "#7A8ACA",
  },
  {
    id:     4,
    badge:  "À domicile",
    title:  "Analyses de laboratoire\nsans se déplacer",
    cta:    "Prendre RDV",
    href:   "/patient/lab-exams",
    icon:   "🧪",
    color:  "#CA7A8A",
  },
]

export function PromoBanner() {
  const [current,  setCurrent]  = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartX = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % SLIDES.length) + SLIDES.length) % SLIDES.length)
  }, [])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  const startAutoPlay = useCallback(() => {
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, 4000)
  }, [])

  useEffect(() => {
    startAutoPlay()
    return () => clearInterval(intervalRef.current)
  }, [startAutoPlay])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    setIsDragging(true)
    clearInterval(intervalRef.current)
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -50) next()
    else if (dx > 50) prev()
    setIsDragging(false)
    startAutoPlay()
  }

  return (
    <div
      className="relative mb-5 overflow-hidden rounded-2xl"
      style={{ height: 152, background: "#141414" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides (tous positionnés en absolu, translateX gère l'entrée/sortie) */}
      {SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== current}
          className="absolute inset-0 flex items-center justify-between px-5 py-4"
          style={{
            background:  `linear-gradient(135deg, ${slide.color}28 0%, #141414 70%)`,
            transform:   `translateX(${(i - current) * 100}%)`,
            transition:  isDragging ? "none" : "transform 0.42s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Cercle décoratif */}
          <div
            className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 rounded-full"
            style={{ width: 110, height: 110, background: slide.color, opacity: 0.08 }}
          />

          {/* Texte + CTA */}
          <div className="relative z-10 flex-1 min-w-0 pr-4">
            <span
              className="mb-1.5 inline-block text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: slide.color }}
            >
              {slide.badge}
            </span>
            <p className="mb-3 whitespace-pre-line text-[16px] font-bold leading-snug text-white">
              {slide.title}
            </p>
            <Link href={slide.href}>
              <button
                className="rounded-xl px-4 py-2 text-[12px] font-bold text-black transition-opacity active:opacity-80"
                style={{ background: slide.color }}
              >
                {slide.cta}
              </button>
            </Link>
          </div>

          {/* Icône */}
          <div className="relative z-10 shrink-0 text-[52px] leading-none select-none">
            {slide.icon}
          </div>
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => { goTo(i); startAutoPlay() }}
            className="rounded-full transition-all duration-300"
            style={{
              width:      i === current ? 18 : 6,
              height:     6,
              background: i === current ? "#C8906A" : "#3A3A3A",
            }}
          />
        ))}
      </div>
    </div>
  )
}
