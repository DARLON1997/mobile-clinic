#!/usr/bin/env node
/**
 * Vérifie que tous les packages importés dans src/ sont déclarés dans package.json.
 * Détecte les dépendances implicites qui fonctionnent en local mais cassent sur Vercel.
 * Usage: node scripts/check-explicit-deps.js
 */

const fs   = require("fs")
const path = require("path")
const Module = require("module")

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"))
const declared = new Set([
  ...Object.keys(pkg.dependencies   || {}),
  ...Object.keys(pkg.devDependencies || {}),
])

// Modules built-in Node.js (avec et sans préfixe node:)
const builtins = new Set([
  ...Module.builtinModules,
  ...Module.builtinModules.map(m => `node:${m}`),
])

// Packages "virtuels" — jamais dans package.json mais valides
const VIRTUAL = new Set([
  "server-only", "client-only",
  "react/jsx-runtime", "react/jsx-dev-runtime",
])

function getPackageName(importSrc) {
  if (importSrc.startsWith("@")) {
    // Scoped: @scope/package[/subpath] → @scope/package
    const parts = importSrc.split("/")
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importSrc
  }
  // Non-scoped: package[/subpath] → package
  return importSrc.split("/")[0]
}

function walkDir(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !["node_modules", ".next", ".git", "dist"].includes(entry.name)) {
      results.push(...walkDir(full))
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full)
    }
  }
  return results
}

const srcDir   = path.resolve(__dirname, "../src")
const files    = walkDir(srcDir)
const fromRe   = /from\s+['"]([^'"]+)['"]/g
const dynRe    = /(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)/g
const sideRe   = /^\s*import\s+['"]([^'"]+)['"]/gm

const missing  = new Map() // packageName → first file that uses it
const checked  = new Set()

for (const file of files) {
  const content = fs.readFileSync(file, "utf-8")
  const allSrcs = []

  for (const re of [fromRe, dynRe, sideRe]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(content)) !== null) allSrcs.push(m[1])
  }

  for (const src of allSrcs) {
    // Skip relative imports and internal alias
    if (src.startsWith(".") || src.startsWith("@/") || src.startsWith("/")) continue
    // Skip virtual packages
    if (VIRTUAL.has(src)) continue

    const pkgName = getPackageName(src)

    // Skip Node built-ins
    if (builtins.has(pkgName)) continue
    // Skip TypeScript special imports (e.g. "typescript")
    if (pkgName === "typescript") continue

    if (checked.has(pkgName)) continue
    checked.add(pkgName)

    if (!declared.has(pkgName)) {
      const relFile = path.relative(process.cwd(), file).replace(/\\/g, "/")
      if (!missing.has(pkgName)) missing.set(pkgName, relFile)
    }
  }
}

if (missing.size > 0) {
  console.error("\n[check-deps] ❌ Dépendances utilisées mais NON déclarées dans package.json :\n")
  for (const [pkg, file] of missing) {
    console.error(`  • "${pkg}"  (premier import dans ${file})`)
  }
  console.error(`\n  → Corriger: npm install ${[...missing.keys()].join(" ")}`)
  console.error(`  → Puis relancer: npm run build\n`)
  process.exit(1)
} else {
  console.log("[check-deps] ✅ Toutes les dépendances sont explicitement déclarées dans package.json.")
}
