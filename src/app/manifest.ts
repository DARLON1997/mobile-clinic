import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Mobile Clinic",
    short_name:       "Mobile Clinic",
    description:      "La santé plus proche de vous, partout où vous êtes.",
    start_url:        "/",
    display:          "standalone",
    background_color: "#0A0A0A",
    theme_color:      "#0A0A0A",
    orientation:      "portrait",
    lang:             "fr",
    categories:       ["health", "medical"],
    icons: [
      {
        src:     "/pwa/icon-192x192.png",
        sizes:   "192x192",
        type:    "image/png",
      },
      {
        src:     "/pwa/icon-512x512.png",
        sizes:   "512x512",
        type:    "image/png",
      },
      {
        src:     "/pwa/icon-maskable-512x512.png",
        sizes:   "512x512",
        type:    "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name:        "Prendre un RDV",
        url:         "/patient/book",
        description: "Réserver une consultation",
      },
    ],
  }
}
