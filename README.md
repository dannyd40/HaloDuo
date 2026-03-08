# Halo Duo

Application web de bien-être pour couples. Deux partenaires notent leur ressenti quotidien en privé. L'app analyse les scores individuels et leur asymétrie, choisit le bon mode de réponse IA, et génère des conseils personnalisés selon le cadre éthique/spirituel choisi.

## Stack technique

| Service | Technologie | Rôle |
|---------|-------------|------|
| Backend | Node.js / Express | API REST, auth JWT, moteur IA, Stripe webhooks |
| Frontend | React 18 / Vite | SPA couple + viewer PDF |
| Base de données | PostgreSQL 16 + pgvector | Données + embeddings RAG (768-dim) |
| Embeddings | Ollama (nomic-embed-text) | Génération embeddings locaux pour RAG |
| IA | Groq API (Llama 4 Scout) | Conseils individuels + recommandations couple |
| Paiements | Stripe | Abonnements freemium → premium |
| Auth | JWT + Google OAuth 2.0 | Connexion email/password et Google |
| Proxy | Nginx | Reverse proxy, `/api` → backend, `/` → frontend |

## Prérequis

- Docker & Docker Compose
- Compte [Groq](https://console.groq.com/) (clé API gratuite, 14 400 req/jour)
- Compte [Stripe](https://stripe.com/) (clé test ou live)
- Google OAuth credentials (optionnel)

## Installation

```bash
# 1. Cloner le projet
git clone <repo-url> && cd HaloDuo

# 2. Configurer l'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 3. Lancer tous les services
docker-compose up --build
```

L'app est accessible sur `http://localhost` (port 80 via Nginx).

## Développement local (sans Docker)

```bash
# Backend
cd backend
npm install
npm run dev          # nodemon sur port 3000

# Frontend (dans un autre terminal)
cd frontend
npm install
npm run dev          # Vite sur port 5173
```

> Nécessite une instance PostgreSQL avec pgvector et Ollama en local.

## Déploiement (Coolify / VPS)

1. Upload ou `git clone` sur le VPS
2. Copier `.env.example` → `.env` et remplir les valeurs de production
3. Coolify → New Service → Docker Compose → pointer vers le dossier
4. Configurer le domaine + SSL dans Coolify
5. `docker-compose up -d`

## Modèle freemium

| Fonctionnalité | Gratuit | Premium |
|----------------|---------|---------|
| Journal quotidien | ✅ Illimité | ✅ Illimité |
| Conseil IA individuel | 3/semaine | ✅ Illimité |
| Recommandation commune | 1/semaine | ✅ Illimité |
| Historique | 7 jours | 90 jours |
| Upload PDF éthique | ❌ | Jusqu'à 5 |
| Viewer PDF + surlignage IA | ❌ | ✅ |

## Principes fondamentaux

1. **Confidentialité structurelle** — Les scores individuels ne sont jamais visibles par l'autre partenaire
2. **Analyse d'asymétrie** — Toujours calculer l'écart entre partenaires, pas juste le total
3. **Mode adaptatif** — 5 modes IA selon la situation réelle (célébration, conseil doux, asymétrique, désamorçage, soutien)
4. **Non-culpabilisation** — Toujours parler du couple, jamais pointer un individu
5. **RAG ciblé** — 3 chunks max (~400 tokens), pertinents à la situation du jour
6. **Douceur absolue** — L'app accompagne, ne juge jamais

## Cadres éthiques supportés

- 🕊️ Laïque (psychologie : Gottman, CNV, attachement)
- ☪️ Islam (Mawadda, Rahma, Shura)
- ✝️ Christianisme (Agapè, alliance sacrée, pardon)
- ✡️ Judaïsme (Shalom Bayit, Onah, Teshuvah)
- ☸️ Bouddhisme (pleine conscience, Karuna, Metta)

## Variables d'environnement

Voir `.env.example` pour la liste complète. Variables requises :

- `POSTGRES_PASSWORD` — Mot de passe PostgreSQL
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Secrets JWT
- `GROQ_API_KEY` — Clé API Groq
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` — Clés Stripe
- `APP_URL` — URL publique de l'application
