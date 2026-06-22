"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"

const SLIDES = [
  {
    id:      1,
    image:   "/images/promo/promo-consultation-domicile.jpg",
    title:   "Une consultation, même loin de la ville",
    text:    "Nos médecins se déplacent jusqu'à vous, où que vous soyez.",
    cta:     "Réserver une visite",
    ctaLink: "/patient/book",
  },
  {
    id:      2,
    image:   "/images/promo/promo-call-center-debordee.jpg",
    title:   "Fini les files d'attente interminables",
    text:    "Prenez rendez-vous en quelques secondes, sans bouger de chez vous.",
    cta:     "Consulter maintenant",
    ctaLink: "/patient/book",
  },
  {
    id:      3,
    image:   "/images/promo/promo-teleconsultation-mobile.jpg",
    title:   "Votre médecin, dans votre poche",
    text:    "Échangez en vidéo avec un professionnel de santé en quelques clics.",
    cta:     "Démarrer une téléconsultation",
    ctaLink: "/patient/book",
  },
  {
    id:      4,
    image:   "/images/promo/promo-soins-infirmiers.jpg",
    title:   "Des soins infirmiers à la maison",
    text:    "Pansements, prélèvements et soins assurés par nos infirmiers à domicile.",
    cta:     "Demander un soin à domicile",
    ctaLink: "/patient/book",
  },
  {
    id:      5,
    image:   "/images/promo/promo-kine-domicile.jpg",
    title:   "Retrouvez votre mobilité chez vous",
    text:    "Nos kinésithérapeutes vous accompagnent dans votre rééducation à domicile.",
    cta:     "En savoir plus",
    ctaLink: "/patient/book",
  },
]

export function PromoBanner() {
  const router      = useRouter()
  const [current,   setCurrent]   = useState(0)
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
      style={{ height: 200 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden={i !== current}
          className="absolute inset-0"
          style={{
            transform:  `translateX(${(i - current) * 100}%)`,
            transition: isDragging ? "none" : "transform 0.42s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Photo de fond */}
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            sizes="(max-width: 768px) 100vw, 640px"
            style={{ objectFit: "cover", objectPosition: "center" }}
            priority={slide.id === 1}
          />

          {/* Dégradé sombre du bas vers le haut pour lisibilité du texte */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(10,10,10,0.88) 0%, rgba(10,10,10,0.42) 55%, rgba(10,10,10,0.10) 100%)",
            }}
          />

          {/* Contenu texte + CTA (positionné en bas) */}
          <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-8">
            <p className="mb-1 text-[15px] font-bold leading-tight text-white drop-shadow">
              {slide.title}
            </p>
            <p className="mb-3 text-[11px] leading-snug text-white/80">
              {slide.text}
            </p>
            <button
              onClick={() => router.push(slide.ctaLink)}
              className="rounded-xl bg-white/90 px-4 py-1.5 text-[11px] font-bold text-gray-900 shadow transition-opacity active:opacity-75"
            >
              {slide.cta} →
            </button>
          </div>
        </div>
      ))}

      {/* Dots de pagination */}
      <div className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => { goTo(i); startAutoPlay() }}
            className="rounded-full transition-all duration-300"
            style={{
              width:      i === current ? 18 : 6,
              height:     6,
              background: i === current ? "#ffffff" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    </div>
  )
}
