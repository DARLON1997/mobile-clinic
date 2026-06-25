import { spawnSync }       from "node:child_process"
import { randomUUID }      from "node:crypto"
import withSerwistInit     from "@serwist/next"
import type { NextConfig }  from "next"

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID()

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  // ⚠️ Désactivé en dev — évite le "cache hell" pendant le développement
  disable: process.env.NODE_ENV === "development",
  // ⚠️ CRITIQUE Mobile Clinic : ne JAMAIS recharger automatiquement au retour
  // en ligne — un médecin en saisie de notes perdrait son travail (race condition
  // entre le debounce de sauvegarde et le rechargement forcé du SW).
  reloadOnOnline: false,
  cacheOnNavigation: true,
})

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.daily.co" },
    ],
  },

  async headers() {
    const isDev = process.env.NODE_ENV === "development"
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",       value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",     value: "camera=*, microphone=*, geolocation=(self)" },
          ...(isDev ? [] : [
            { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-eval' 'unsafe-inline' *.daily.co js.pusher.com",
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
                "font-src 'self' fonts.gstatic.com",
                "img-src 'self' data: blob: res.cloudinary.com",
                "connect-src 'self' *.daily.co *.pusher.com api.flutterwave.com",
                "media-src 'self' blob:",
                "frame-src 'self' *.daily.co",
              ].join("; "),
            },
          ]),
        ],
      },
    ]
  },
}

export default withSerwist(nextConfig)
