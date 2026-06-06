import { defineConfig } from "prisma/config"
import { readFileSync } from "fs"
import { resolve } from "path"

// Charge .env.local puis .env (comme Next.js) sans dépendance externe
function loadEnvFile(file: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), file), "utf-8")
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#\s][^=]*)=(.*)$/)
      if (match) {
        const key = match[1].trim()
        const value = match[2].trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = value
      }
    }
  } catch { /* fichier absent — ignoré */ }
}

loadEnvFile(".env.local")
loadEnvFile(".env")

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
})
