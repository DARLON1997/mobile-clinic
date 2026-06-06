"use client"

import Link      from "next/link"
import { useState, useEffect } from "react"
import { Menu, X, Heart } from "lucide-react"

export function Navbar() {
  const [open,     setOpen]     = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass-dark border-b border-[#2A2A2A]"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#C8906A] to-[#E8B49A] transition-shadow group-hover:shadow-[0_0_14px_rgba(200,144,106,0.4)]">
            <Heart className="h-4 w-4 text-[#0A0A0A]" fill="currentColor" />
          </div>
          <span className="font-cormorant text-xl font-semibold italic text-white tracking-tight">
            Mobile Clinic
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          {[
            { href: "#services",     label: "Services" },
            { href: "#how-it-works", label: "Comment ça marche" },
            { href: "#doctors",      label: "Médecins" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="font-montserrat text-[13px] font-medium tracking-wide text-[#AAAAAA] transition-colors hover:text-white">
              {label}
            </Link>
          ))}
          <div className="ml-4 flex items-center gap-3">
            <Link href="/login"
              className="font-montserrat text-[13px] font-medium tracking-wide text-[#AAAAAA] hover:text-[#C8906A] transition-colors">
              Connexion
            </Link>
            <Link href="/register"
              className="btn-gold rounded-lg px-5 py-2.5 text-[13px] font-semibold tracking-[0.06em]">
              Prendre un RDV
            </Link>
          </div>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="text-white md:hidden p-1">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="glass-dark border-t border-[#2A2A2A] px-5 py-5 md:hidden animate-fade-in">
          <div className="flex flex-col gap-5">
            {[
              { href: "#services",     label: "Services" },
              { href: "#how-it-works", label: "Comment ça marche" },
              { href: "#doctors",      label: "Médecins" },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                onClick={() => setOpen(false)}
                className="font-montserrat text-sm text-[#AAAAAA] hover:text-white">
                {label}
              </Link>
            ))}
            <hr className="border-[#2A2A2A]" />
            <Link href="/login" onClick={() => setOpen(false)}
              className="font-montserrat text-sm text-[#AAAAAA]">Connexion</Link>
            <Link href="/register" onClick={() => setOpen(false)}
              className="btn-gold block w-full rounded-lg py-3 text-center text-sm font-semibold tracking-wider">
              Prendre un RDV
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
