/**
 * Génère les icônes PWA depuis un SVG inline fidèle au LogoMark.
 * Utilise sharp (déjà présent dans les deps de Next.js).
 */
import sharp from "sharp"
import { readFileSync, writeFileSync, mkdirSync } from "fs"
import { fileURLToPath } from "url"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT      = path.resolve(__dirname, "..")
const OUT       = path.join(ROOT, "public", "pwa")
const STORE_OUT = path.join(ROOT, "store-assets")

// SVG du logo Mobile Clinic (version rasterisable — cercle pinceau + stéthoscope)
function buildSVG(size, maskable = false) {
  const bg      = "#0A0A0A"
  const gold    = "#C8906A"
  const padding = maskable ? size * 0.2 : size * 0.1   // zone sécurité maskable = 20%
  const inner   = size - padding * 2

  const cx = size / 2
  const cy = size / 2
  const r  = inner / 2 * 0.85
  const sw = inner * 0.09

  // Arc ouvert ~93% du cercle
  const circ  = 2 * Math.PI * r
  const gap   = circ * 0.07
  const dash  = circ - gap

  // Stéthoscope simplifié SVG
  const ic = inner * 0.28   // taille de l'icône stéthoscope
  const ix = cx - ic / 2
  const iy = cy - ic / 2

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}" rx="${maskable ? size * 0.18 : 0}"/>

  <!-- Halo -->
  <circle cx="${cx}" cy="${cy}" r="${r}"
    fill="none" stroke="${gold}" stroke-width="${sw + 8}"
    stroke-dasharray="${dash} ${gap}" stroke-linecap="round"
    opacity="0.08"
    transform="rotate(-92 ${cx} ${cy})"/>

  <!-- Cercle principal cuivré -->
  <circle cx="${cx}" cy="${cy}" r="${r}"
    fill="none" stroke="${gold}" stroke-width="${sw}"
    stroke-dasharray="${dash} ${gap}" stroke-linecap="round"
    opacity="0.95"
    transform="rotate(-92 ${cx} ${cy})"/>

  <!-- Reflet métallique -->
  <circle cx="${cx}" cy="${cy}" r="${r - 1}"
    fill="none" stroke="#FAEBD4" stroke-width="${sw * 0.18}"
    stroke-dasharray="${circ * 0.26} ${circ * 0.74}"
    stroke-dashoffset="${-circ * 0.04}"
    stroke-linecap="round"
    opacity="0.5"
    transform="rotate(-92 ${cx} ${cy})"/>

  <!-- Stéthoscope (simplifié géométriquement) -->
  <g transform="translate(${ix}, ${iy})" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${ic * 0.08}">
    <!-- Tube principal en U -->
    <path d="M${ic*0.25},${ic*0.15} L${ic*0.25},${ic*0.55} Q${ic*0.25},${ic*0.85} ${ic*0.5},${ic*0.85} Q${ic*0.75},${ic*0.85} ${ic*0.75},${ic*0.55} L${ic*0.75},${ic*0.45}"/>
    <!-- Oreillettes -->
    <line x1="${ic*0.1}" y1="${ic*0.1}" x2="${ic*0.25}" y2="${ic*0.15}"/>
    <line x1="${ic*0.9}" y1="${ic*0.1}" x2="${ic*0.75}" y2="${ic*0.15}"/>
    <line x1="${ic*0.08}" y1="${ic*0.07}" x2="${ic*0.1}" y2="${ic*0.1}"/>
    <line x1="${ic*0.92}" y1="${ic*0.07}" x2="${ic*0.9}" y2="${ic*0.1}"/>
    <!-- Tête du stéthoscope -->
    <circle cx="${ic*0.75}" cy="${ic*0.42}" r="${ic*0.13}" fill="white" opacity="0.9"/>
  </g>
</svg>`
}

async function generate(svgStr, outFile, { flatten = false } = {}) {
  const buf = Buffer.from(svgStr, "utf-8")
  let img = sharp(buf)
  // App Store Connect refuse les icônes avec canal alpha — on aplatit sur le
  // fond de marque plutôt que de laisser une transparence résiduelle (audit H6).
  if (flatten) img = img.flatten({ background: "#0A0A0A" })
  await img.png({ quality: 100 }).toFile(outFile)
  console.log(`✅ ${outFile}`)
}

await generate(buildSVG(192,  false), `${OUT}/icon-192x192.png`)
await generate(buildSVG(512,  false), `${OUT}/icon-512x512.png`)
await generate(buildSVG(512,  true),  `${OUT}/icon-maskable-512x512.png`)

// Icône marketing App Store Connect (1024×1024, sans alpha) — jamais servie
// publiquement, uniquement pour le dépôt manuel lors de la soumission (H6).
// Le 512×512 Play Console (32-bit avec alpha) est déjà couvert par
// icon-512x512.png ci-dessus, aucune génération supplémentaire nécessaire.
mkdirSync(STORE_OUT, { recursive: true })
await generate(buildSVG(1024, false), `${STORE_OUT}/icon-1024x1024-appstore.png`, { flatten: true })

console.log("\n🎉 Icônes PWA générées avec succès.")
