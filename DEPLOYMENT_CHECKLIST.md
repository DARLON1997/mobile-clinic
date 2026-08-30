# Checklist de déploiement — Mobile Clinic

À suivre **avant chaque déploiement majeur** (nouveau module, changement de credentials, mise à jour de dépendance).

---

## 1. Avant de changer le mot de passe Supabase

- [ ] Le nouveau mot de passe contient **uniquement des lettres et des chiffres** (jamais `@` `#` `%` `!` espace — ils cassent l'URL de connexion)
- [ ] `DATABASE_URL` mis à jour sur Vercel dans les **3 environnements** : Production, Preview, Development
- [ ] `DIRECT_URL` mis à jour de la même façon
- [ ] Visiter **`/api/health`** en production immédiatement après → doit retourner `{ "database": "connected" }`

```
https://<votre-domaine>.vercel.app/api/health
```

---

## 2. Avant d'ajouter une nouvelle dépendance npm

- [ ] `npm install <package> --save` (jamais compter sur une peer dependency implicite)
- [ ] Vérifier si le package est **ESM-only** : `cat node_modules/<package>/package.json | grep '"type"'`
  - Si `"type": "module"` → préférer `fetch()` natif vers l'API REST du service
- [ ] `npm run check-deps` passe sans erreur

### Dépendances à risque ESM identifiées dans ce projet

| Package | Type | Risque | Action recommandée |
|---|---|---|---|
| `@react-pdf/renderer` | `module` (ESM) | **Élevé** — si importé dans une route API serveur, cassera le build | Importer uniquement dans des composants Client (`"use client"`) |
| `nodemailer` | CJS | Faible | Garder mais ne pas l'utiliser sur Vercel (Edge runtime incompatible) |
| Autres (africastalking, pusher, cloudinary, flutterwave) | CJS | Faible | OK en usage normal |

---

## 3. Avant d'ajouter un nouveau modèle Prisma

- [ ] `npx prisma migrate dev --name <nom>` exécuté **en local** d'abord (port 5432 requis)
- [ ] Si le port 5432 est bloqué et qu'un patch SQL manuel est nécessaire :
  - Écrire un script idempotent (`IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`)
  - L'exécuter dans Supabase SQL Editor
  - Puis vérifier la synchronisation : `npm run verify-schema`
- [ ] `npm run verify-schema` ne montre **aucune colonne manquante**

---

## 4. Avant tout push vers `main`

- [ ] `npx tsc --noEmit` → 0 erreur TypeScript
- [ ] `npm run check-deps` → toutes les dépendances déclarées
- [ ] `npm run build` réussit en local
- [ ] Après déploiement Vercel : `/api/health` retourne `{ "database": "connected" }`

---

## 5. Diagnostic rapide en cas de "Erreur serveur."

1. Ouvrir **Vercel → projet → Deployments → choisir le dernier → Functions**
2. Filtrer par la route concernée (ex: `/api/auth/pre-login`)
3. Lire le log `[PRE_LOGIN]` ou `[REGISTER]` pour voir le vrai message d'erreur
4. **Ne jamais** exposer `err.message` dans la réponse JSON — les logs Vercel suffisent

### Causes les plus fréquentes et leur signature dans les logs

| Message dans les logs | Cause | Correction |
|---|---|---|
| `Authentication failed … credentials … not valid` | Mauvais mot de passe dans DATABASE_URL | Reset Supabase + màj Vercel |
| `column "X" does not exist` | Schéma DB désynchronisé | `npm run verify-schema` puis patch SQL |
| `Cannot find module 'pg'` | Dépendance implicite manquante | `npm install pg` |
| `Resend error 401` | RESEND_API_KEY invalide ou absente | Vérifier variable sur Vercel |
| `P1001` Prisma | DB inaccessible (réseau ou URL malformée) | Vérifier DATABASE_URL format |

---

## 6. Variables d'environnement requises sur Vercel

| Variable | Exemple | Obligatoire |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.xxx:PASS@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | Oui |
| `DIRECT_URL` | `postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres` | Oui (migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` | Oui |
| `NEXTAUTH_URL` | `https://mobile-clinic.vercel.app` | Oui |
| `RESEND_API_KEY` | `re_xxxx` | Oui |
| `NEXT_PUBLIC_PAYMENT_ENABLED` | `false` | Oui |
| `VAPID_PUBLIC_KEY` | générée via `node -e "console.log(require('web-push').generateVAPIDKeys())"` | Oui (notifications push, audit H3) |
| `VAPID_PRIVATE_KEY` | idem — **secret, jamais exposé au client** | Oui (idem) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | même valeur que `VAPID_PUBLIC_KEY` (dupliquée pour être lisible côté client) | Oui (idem) |
| `VAPID_SUBJECT` | `mailto:contact@mobile-clinic.cg` | Non (défaut codé en dur sinon) |
