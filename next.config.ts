import type { NextConfig } from "next"

const isDev = process.env.NODE_ENV === "development"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.daily.co" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "camera=self, microphone=self, geolocation=self" },
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

// ── PWA (uniquement en production) ────────────────────────────────────────────
let finalConfig: NextConfig = nextConfig

if (!isDev) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa")({
    dest:         "public",
    register:     true,
    skipWaiting:  true,
    disable:      isDev,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler:    "NetworkFirst",
        options: {
          cacheName: "mobile-clinic-cache",
          expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  })
  finalConfig = withPWA(nextConfig)
}

export default finalConfig
