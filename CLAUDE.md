# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mobile Clinic** — Plateforme de télémédecine, Congo-Brazzaville.  
Stack: **Next.js 16 + React 19 + TypeScript strict + Tailwind CSS v4 + NextAuth v5 (Auth.js) + Prisma + PostgreSQL**

> ⚠️ Next.js 16 — lire `node_modules/next/dist/docs/` en cas de doute sur une API.

## Commands

```bash
npm run dev                           # dev server localhost:3000
npm run build                         # production build + tsc
npm run lint                          # ESLint
npx tsc --noEmit                      # type-check only
npx prisma studio                     # UI base de données
npx prisma migrate dev --name <name>  # créer une migration
npx prisma db push                    # pousser schéma sans migration (dev)
npx prisma generate                   # régénérer le client Prisma
```

## Architecture

`@` alias → `./src/`

```
src/
  auth.ts               ← NextAuth v5 (JWT strategy, Credentials, 5 rôles)
  middleware.ts          ← Protection routes par rôle + règle critique médecin
  lib/
    prisma.ts           ← Client Prisma singleton (globalThis pattern)
    utils.ts            ← cn(), getDashboardUrl(), formatXAF(), formatDate()
    auth-actions.ts     ← Server actions auth (loginAction, logoutAction)
  types/
    next-auth.d.ts      ← Augmentation Session { id, role } et JWT
  components/
    ui/                 ← Button, Input, Card, Badge (CVA + Tailwind v4)
    landing/            ← Navbar, Hero, Services, HowItWorks, Footer
  app/
    page.tsx            ← Landing page publique
    login/page.tsx      ← Connexion (Client Component, signIn Credentials)
    register/page.tsx   ← Inscription patient 3 étapes (Client Component)
    (dashboard)/        ← Route group protégé
      layout.tsx        ← Vérifie session → redirect /login
      admin/            ← SUPER_ADMIN
      doctor/           ← MEDECIN
      patient/          ← PATIENT
      call-center/      ← CALL_CENTER_AGENT
      agent/            ← AGENT_TERRAIN
    api/
      auth/[...nextauth]/route.ts   ← handlers Auth.js
      auth/register/route.ts        ← POST inscription patient
    unauthorized/page.tsx
prisma/schema.prisma    ← Schéma complet (User, Appointment, Mission, AuditLog…)
.env.example            ← Template des variables d'environnement
```

## Rôles & RÈGLE CRITIQUE

**5 rôles** : `SUPER_ADMIN` · `CALL_CENTER_AGENT` · `MEDECIN` · `AGENT_TERRAIN` · `PATIENT`

**⚠️ RÈGLE CRITIQUE — Un médecin ne peut JAMAIS accéder aux données d'un patient sans `appointment.adminApproval === true` en base de données.**
- Le middleware vérifie le rôle uniquement
- Chaque route handler / server action qui lit un dossier patient DOIT vérifier `adminApproval`

## Routes protégées (middleware.ts)

| Préfixe        | Rôle requis        |
|----------------|--------------------|
| `/admin`       | SUPER_ADMIN        |
| `/doctor`      | MEDECIN            |
| `/patient`     | PATIENT            |
| `/call-center` | CALL_CENTER_AGENT  |
| `/agent`       | AGENT_TERRAIN      |

## Tailwind v4

Pas de `tailwind.config.ts`. Configuration via `@theme inline { }` dans `globals.css`.  
Custom colors : `primary` (blue-700), `medical-green` (green-600).

## Prisma

- Singleton : `import { prisma } from "@/lib/prisma"`
- Toute query médecin → patient doit inclure `adminApproval: true` dans le `where`
- Enum `Role`, `AppointmentStatus`, `MissionStatus` définis dans `schema.prisma`

## Environment

Copier `.env.example` → `.env.local` :
```
DATABASE_URL=postgresql://USER:PASS@HOST:5432/mobile_clinic
AUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

## Règles opérationnelles (post-audit "Erreur serveur.")

### RÈGLE MOT DE PASSE DB
Après tout changement de mot de passe Supabase :
1. Mettre à jour `DATABASE_URL` et `DIRECT_URL` sur Vercel dans les 3 environnements
2. Visiter `/api/health` en production → doit retourner `{ "database": "connected" }`
3. **Le mot de passe ne doit contenir que des lettres et des chiffres** — les caractères spéciaux (`@` `#` `%` `!`) cassent les URLs de connexion PgBouncer

### RÈGLE MIGRATION DB
Si `npx prisma migrate dev` échoue (port 5432 bloqué) :
1. Appliquer le patch SQL manuellement dans Supabase SQL Editor (scripts idempotents uniquement)
2. Exécuter `npm run verify-schema` pour confirmer la synchronisation
3. Ne jamais considérer une migration terminée sans avoir vérifié que schéma réel = schema.prisma

### RÈGLE NOUVELLE DÉPENDANCE
Avant d'ajouter un package :
1. `npm install <pkg> --save` — jamais compter sur une peer dependency implicite
2. Vérifier si ESM-only : `cat node_modules/<pkg>/package.json | grep '"type"'`
3. Si `"type": "module"` → utiliser `fetch()` natif vers l'API REST à la place du SDK
4. Vérifier : `npm run check-deps` doit passer sans erreur

### RÈGLE DEBUG PRODUCTION
- Ne jamais exposer `err.message` dans la réponse JSON au frontend
- Utiliser `logServerError("CONTEXTE", err)` dans tous les catch des routes API critiques
- Consulter **Vercel → Deployments → Functions → Logs** pour lire le détail

### Health check
`GET /api/health` — route publique, retourne `{ database: "connected" }` ou `503`

### Scripts de garde-fous
- `npm run check-deps` — vérifie que tous les imports sont déclarés dans package.json (lancé automatiquement avant `npm run build`)
- `npm run verify-schema` — compare les colonnes réelles de la DB avec schema.prisma
