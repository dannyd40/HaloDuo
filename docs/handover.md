# HaloDuo — Handover Session 2026-03-08

Ce document résume tout le travail effectué lors de la session de mise en production.

---

## 1. Déploiement Coolify

### Infrastructure mise en place

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| **HaloDuo** (app) | Dockerfile custom | 8080 | nginx + backend via supervisord |
| **PostgreSQL** | `pgvector/pgvector:pg16` | 5432 | Extension pgvector activée |
| **Ollama** | `ollama/ollama` | 11434 | Volume persistant `ollama-data` → `/root/.ollama` |

### Dockerfile production

- Multi-stage build : frontend (Vite build) → image finale (nginx + node + supervisord)
- Nginx écoute sur **8080** (pas 80, car Coolify utilise le port exposé)
- Supervisord force `PORT=3000` pour le backend (empêche Coolify d'injecter PORT=8080)
- `curl` et `wget` installés pour le healthcheck Coolify
- Auto-deploy sur push vers `master`

### Base de données

- Image `pgvector/pgvector:pg16` (pas `postgres:16` standard — pgvector requis)
- User : `postgres` (pas de user custom)
- DB : `halo_duo` (créée manuellement)
- Schema : 9 tables initialisées via `backend/sql/setup.sh`
- Script supporte DROP TABLE pour reset complet

### Variables d'environnement

- **Runtime (Environment Variables)** : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GROQ_API_KEY`, `GOOGLE_*`, `STRIPE_*`, `APP_URL`, `OLLAMA_URL`, `ADMIN_KEY`
- **Build Args** : `VITE_API_URL=/api`, `VITE_GOOGLE_CLIENT_ID`, `VITE_STRIPE_PUBLISHABLE_KEY`
- Les `VITE_*` doivent être en Build Args (injectées au build Vite, pas au runtime)

---

## 2. Bugs corrigés

### CRITICAL — Corrigés

| # | Bug | Fichiers | Fix |
|---|-----|----------|-----|
| 1 | **SQL injection** dans INTERVAL | `journal.js`, `recommandation.js` | `make_interval(days => $2)` paramétrisé |
| 2 | **Backend crash** sur erreur Groq | `journal.js`, `recommandation.js` | Try/catch + fallback message |
| 3 | **Frontend appelle routes supprimées** | `Bibliotheque.jsx`, `PDFViewer.jsx` | Upload/download UI retirée |
| 4 | **Healthcheck failed** (curl manquant) | `Dockerfile` | `apk add curl wget` |
| 5 | **Backend sur port 8080** au lieu de 3000 | `supervisord.conf` | `environment=PORT=3000` |
| 6 | **"Unexpected token '<'"** | Frontend | `VITE_API_URL` doit être `/api` en Build Args |
| 7 | **Duplicate inviteCode variable** | `Onboarding.jsx` | Renommé en `generatedCode` |
| 8 | **Partenaire "En attente"** même après acceptation | `auth.js` `/me` | Ajout query pour `partenaire_prenom` |
| 9 | **Tableau page vide** si erreur API | `Tableau.jsx` | Ajout error state + `partenaire.mon_prenom` → `prenom` |
| 10 | **Historique endpoint fragile** | `recommandation.js` | Utilise `req.user.plan` au lieu de re-JOIN abonnements |

### WARNING — Restants (voir `docs/audit.md`)

- Fuite privacy potentielle via highlights (chunks individuels exposés)
- Pas de rate limiting sur auth
- Pas de validation des entrées (email, scores, prénom)
- Tokens JWT dans localStorage (risque XSS, acceptable pour SPA)

---

## 3. Fonctionnalités ajoutées

### Invitation partenaire améliorée

- **Lien d'invitation** : `/register?code=XXXXXXXX` (copié depuis page Compte)
- **Auto-join** : après register ou login avec `?code=`, le partenaire rejoint automatiquement le couple
- **Login.jsx** : détecte `?code=` → après login, rejoint le couple si pas déjà en couple
- **Register.jsx** : détecte `?code=` → après inscription, rejoint le couple → redirige vers `/journal`
- **Onboarding.jsx** : pré-remplit le code, mode "rejoindre" par défaut si `?code=` présent
- **Compte.jsx** : bouton "Copier le lien d'invitation" avec le code du couple

### Premium partagé entre partenaires

- **`auth.js` middleware** : si un partenaire est premium (`plan != 'gratuit'`), l'autre hérite du même plan
- Vérifié à chaque requête authentifiée via JOIN sur les partenaires du couple
- Pas besoin de payer deux fois — un abonnement suffit pour le couple

### Guides éthiques intégrés (RAG)

- 5 guides Markdown créés : `guide-laique.md`, `guide-islam.md`, `guide-christianisme.md`, `guide-judaisme.md`, `guide-bouddhisme.md`
- Organisés par dossier : `backend/data/pdfs/<cadre>/`
- Support PDF + Markdown dans chaque dossier
- **Auto-indexation** : à la création d'un couple, les guides du cadre choisi sont indexés automatiquement (si Ollama disponible)
- **Route admin** : `POST /api/admin/indexer` pour indexer tous les couples existants

### Route admin pour indexation RAG

- `POST /api/admin/indexer` — indexe tous les couples
- `POST /api/admin/indexer/:coupleId` — indexe un couple spécifique
- Protégé par header `x-admin-key` (variable `ADMIN_KEY`)
- Parcourt tous les fichiers `.md` et `.pdf` du dossier `backend/data/pdfs/<cadre>/`

### Landing page

- Ajout lien "Se connecter" dans le header de la landing page

### Documentation

- `docs/database.md` : documentation complète du data model avec relations et colonnes
- `docs/audit.md` : audit codebase (3 CRITICAL corrigés, 4 WARNING, 5 INFO)
- `CLAUDE.md` : mis à jour avec architecture prod, env vars, admin ops, known issues

---

## 4. Services externes

### Groq (AI)

- Modèle : `meta-llama/llama-4-scout-17b-16e-instruct`
- Génère conseils privés (journal) et recommandations communes (couple)
- **La clé API doit être valide** — créer sur https://console.groq.com
- Erreurs gérées gracefully (fallback message, pas de crash)

### Ollama (Embeddings)

- Modèle : `nomic-embed-text` (768 dimensions)
- Service Coolify séparé, volume persistant `ollama-data`
- Après déploiement : `ollama pull nomic-embed-text` dans le terminal du conteneur
- URL interne configurée dans `OLLAMA_URL` (ex: `http://ollama:11434`)

### Stripe (Paiements)

- Mode sandbox/test
- Webhook : `/api/stripe/webhook` (raw body, configuré avant JSON middleware)
- Plans : mensuel + annuel (Price IDs dans env vars)
- Portal pour gestion abonnement côté client

### Google OAuth

- Callback : `https://haloduo.pocketyapp.com/api/auth/google/callback`
- Redirige vers `APP_URL/auth/callback` avec tokens dans l'URL

---

## 5. Fichiers clés modifiés

```
Dockerfile                          # Multi-stage build, port 8080, curl/wget
nginx/nginx.production.conf         # Listen 8080
supervisord.conf                    # PORT=3000 forcé
backend/src/index.js                # Route admin montée
backend/src/middleware/auth.js      # Premium sharing entre partenaires
backend/src/routes/auth.js          # /me retourne partenaire_prenom
backend/src/routes/journal.js       # Try/catch Groq, SQL paramétrisé
backend/src/routes/recommandation.js # Try/catch Groq, SQL paramétrisé, req.user.plan
backend/src/routes/couple.js        # Auto-index guides à la création
backend/src/routes/pdf.js           # Read-only (upload/download supprimés)
backend/src/routes/admin.js         # NOUVEAU — indexation RAG admin
backend/src/services/rag.js         # Markdown parsing, dossiers par cadre, batch indexation
backend/data/pdfs/<cadre>/          # Guides réorganisés par sous-dossier
frontend/src/pages/Login.jsx        # Auto-join via ?code=
frontend/src/pages/Register.jsx     # Auto-join via ?code=
frontend/src/pages/Onboarding.jsx   # Pré-remplissage code, fix duplicate var
frontend/src/pages/Compte.jsx       # Bouton copier lien d'invitation
frontend/src/pages/Tableau.jsx      # Error handling, fix prenom field
frontend/src/pages/Bibliotheque.jsx # Upload UI retiré
frontend/src/pages/PDFViewer.jsx    # Download retiré
frontend/src/pages/Landing.jsx      # Lien connexion header
```

---

## 6. Prochaines étapes

### Priorité haute
1. **Indexation RAG async** — le bouton "Indexer" timeout (504) sur les gros fichiers (>100 KB). Rendre l'indexation asynchrone : backend lance en background, frontend poll le statut. `fransizca` et `marriage-french` restent bloqués "En cours" (0 chunks)
2. **Reset PDFs bloqués** — `DELETE FROM pdfs WHERE statut = 'indexation' AND nb_chunks = 0;` puis relancer
3. **Clé Groq** — vérifier/renouveler sur console.groq.com (était invalide, pas de conseils IA sans elle)
4. **Tester le flow complet** : inscription → onboarding → journal → tableau → recommandation

### Priorité moyenne
5. **UX bouton indexation** — garder le state entre changements de page ou indicateur global
6. Corriger fuite privacy dans highlights (WARNING #4 audit)
7. Ajouter rate limiting sur `/api/auth/*`
8. Ajouter validation entrées (email, scores, prénom)
9. Configurer Google OAuth callback pour dev local

### Priorité basse
10. Ajouter `.gitattributes` pour CRLF
11. Système de migrations DB (`node-pg-migrate`)
12. User non-root dans Dockerfile
13. Ajouter plus de PDFs/guides dans les dossiers éthiques (christianisme, judaïsme, bouddhisme, laïque)
14. Commiter `package-lock.json` (backend + frontend)
15. Retrouver `marriage-french.pdf` original (jamais commité) et le mettre dans `pdfs-originaux/`
