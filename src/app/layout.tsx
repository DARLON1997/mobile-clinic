import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, DM_Sans, Montserrat } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets:  ["latin"],
  weight:   ["300", "400", "600"],
  style:    ["normal", "italic"],
  variable: "--font-cormorant-var",
  display:  "swap",
})

const dmSans = DM_Sans({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600"],
  variable: "--font-dm-sans-var",
  display:  "swap",
})

const montserrat = Montserrat({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600"],
  variable: "--font-montserrat-var",
  display:  "swap",
})

export const metadata: Metadata = {
  title:       "Mobile Clinic — La santé plus proche de vous",
  description: "Plateforme de télémédecine au Congo-Brazzaville. Consultations vidéo, soins à domicile et prélèvements biologiques.",
  keywords:    ["télémédecine", "Congo", "Brazzaville", "médecin en ligne", "consultation vidéo"],
  manifest:    "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Mobile Clinic" },
  icons: { icon: "/favicon.ico", apple: "/icons/icon-192.png" },
}

export const viewport: Viewport = {
  themeColor:   "#0A0A0A",
  width:        "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`h-full scroll-smooth ${cormorant.variable} ${dmSans.variable} ${montserrat.variable}`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
