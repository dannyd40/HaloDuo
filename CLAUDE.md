# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HaloDuo is a couple wellness app — partners independently log daily emotional scores across 7 axes (Joy, Anger, Solitude, Connection, Well-being, Gratitude, Intimacy), then receive private AI advice and a shared anonymized couple recommendation. Individual scores are **never** revealed to the other partner. The app supports 5 ethical frameworks (laïque, islam, christianisme, judaïsme, bouddhisme) that influence AI-generated advice. Freemium model with Stripe billing.

## Architecture

Monorepo with a single production Docker image (multi-stage Dockerfile at root) + external services:

- **backend/** — Express.js (CommonJS) REST API on port 3000 (internal)
- **frontend/** — React 18 SPA with Vite, built as static files served by nginx
- **postgres** — PostgreSQL 16 with pgvector extension (768-dim embeddings) — separate Coolify service (`pgvector/pgvector:pg16`)
- **ollama** — Embedding model (`nomic-embed-text`) for RAG — separate Coolify service, port 11434
- **nginx** — Reverse proxy inside production container: `/api` → backend:3000, `/` → static files
- **supervisord** — Manages nginx + backend processes in the production container

### Production Container

The root `Dockerfile` builds a single image containing both frontend (static) and backend (node), orchestrated by supervisord. Nginx listens on port **8080**, proxies `/api` to the backend on port 3000. Supervisord forces `PORT=3000` for backend to prevent Coolify override.

### Deployment

Deployed on **Coolify** at `haloduo.pocketyapp.com` via Dockerfile (not Docker Compose). Auto-deploys on push to `master`. PostgreSQL (`pgvector/pgvector:pg16`) and Ollama run as separate Coolify services.

**Important Coolify notes:**
- `VITE_*` variables must be set as **Build Args** (build-time), not runtime env vars
- Coolify injects `PORT` env var — supervisord overrides it to 3000 for the backend
- Healthcheck requires `curl`/`wget` in the container (installed via apk)

## Development Commands

```bash
# Full stack via Docker Compose (local dev)
docker-compose up --build

# Backend only (local dev)
cd backend && npm install && npm run dev   # nodemon on src/index.js

# Frontend only (local dev)
cd frontend && npm install && npm run dev  # Vite dev server, port 5173

# Production frontend build
cd frontend && npm run build
```

Environment variables: copy `.env.example` to `.env` and fill in real values.

## Backend Structure

```
backend/src/
├── index.js          # Express app, route mounting, Stripe raw body handling, health check
├── db.js             # pg Pool connection (DATABASE_URL)
├── middleware/
│   ├── auth.js       # JWT verification, user+plan loading, premium sharing between partners
│   ├── passport.js   # Google OAuth 2.0 strategy
│   └── premium.js    # 403 gate for free-plan users
├── routes/
│   ├── auth.js       # POST register, login, refresh | GET google, google/callback, me
│   ├── journal.js    # POST / (submit scores) | GET /aujourd-hui, /historique
│   ├── recommandation.js  # GET /tableau (couple score), /historique
│   ├── couple.js     # POST /creer, /rejoindre | GET /info — auto-indexes ethical guide on creation
│   ├── stripe.js     # POST /checkout, /portal, /webhook (raw body)
│   ├── pdf.js        # GET / (list), /:pdfId/contenu, /:pdfId/highlights — read-only, no upload
│   └── admin.js      # Admin panel (is_admin guard): GET stats, users, couples, rag | PATCH users/:id | DELETE users/:id | POST indexer, couples/:id/indexer
└── services/
    ├── groq.js       # Groq API (llama-4-scout), personal + couple advice generation
    ├── rag.js        # Markdown/PDF parsing, chunking, Ollama embeddings, vector search, batch indexation
    └── decision.js   # Score analysis, mode selection, trend calculation
```

```
backend/data/pdfs/        # Ethical framework guides organized by cadre
├── laique/               # CNV, Gottman, langages de l'amour
│   └── guide-laique.md
├── islam/                # Mawadda, Rahma, Sabr, Choura + PDFs
│   ├── guide-islam.md
│   ├── Boudjenoun_Le-mariage-en-Islam-Modalites-et-finalite_text.pdf
│   └── fransizca-huzurlu-aile-yuvasi.pdf
├── christianisme/        # Agapè, pardon, grâce
│   └── guide-christianisme.md
├── judaisme/             # Shalom Bayit, Hesed, Tikoun
│   └── guide-judaisme.md
└── bouddhisme/           # Quatre Nobles Vérités, Metta, pleine conscience
    └── guide-bouddhisme.md
```

API routes are all under `/api`. Stripe webhook route must receive raw body (parsed before JSON middleware in index.js).

**Error handling**: Groq API errors are caught gracefully in journal.js and recommandation.js — the backend returns a fallback message instead of crashing.

## Frontend Structure

```
frontend/src/
├── App.jsx           # BrowserRouter, AuthProvider, route definitions, ProtectedRoute, AdminRoute
├── main.jsx          # React root render
├── index.css         # Global styles, CSS variables (--cream, --accent, --gold)
├── hooks/useAuth.jsx # AuthProvider context: login, register, logout, token refresh, /me check
├── utils/api.js      # Fetch wrapper: auto Bearer token, 401 retry with refresh, base URL from VITE_API_URL
├── components/
│   ├── Nav.jsx       # Navbar + BottomNav (5 tabs) + BadgePlan + Admin badge (if is_admin)
│   └── Freemium.jsx  # BannerFreemium + ModalUpgrade (Stripe checkout)
└── pages/
    ├── Journal.jsx, Conseil.jsx         # Personal: score entry + private advice
    ├── Tableau.jsx, Recommandation.jsx  # Couple: shared dashboard + recommendation
    ├── Bibliotheque.jsx, PDFViewer.jsx  # PDF library with RAG highlights
    ├── Onboarding.jsx                   # Create/join couple + ethical framework
    ├── Compte.jsx                       # Account + subscription + invitation link copy
    ├── Landing.jsx                      # Public landing with login link in header
    ├── Login.jsx, Register.jsx          # Auth pages with auto-join via ?code= param
    ├── Pricing.jsx                      # Plans comparison + Stripe checkout
    └── admin/
        ├── Dashboard.jsx                # Admin stats cards + RAG indexation + RAG status
        ├── Utilisateurs.jsx             # User list, plan change, delete
        └── Couples.jsx                  # Couple list, RAG re-index per couple
```

State management: React Context (useAuth) for auth state; local useState in each page. No Redux/Zustand. Tokens stored in localStorage (`hd_access`, `hd_refresh`).

## Key Domain Concepts

- **Axes**: 7 emotional dimensions scored 1-10 per partner per day
- **Score commun**: Anonymized couple average, rounded to nearest 0.5 (prevents deduction of individual scores)
- **Conseil modes**: `celebration`, `conseil_doux`, `conseil_asymetrique`, `desamorcage`, `soutien` — selected by `decision.js` based on score patterns
- **Cadre éthique**: Ethical framework that shapes AI prompts and RAG guide selection
- **Partenaire**: A user linked to a couple; roles are `createur` or `membre`
- Both partners must submit before the couple dashboard reveals the day's shared score
- **Guides intégrés**: Markdown + PDF guides per ethical framework, auto-indexed on couple creation when Ollama is available
- **Premium sharing**: If one partner is premium, the other gets premium too (handled in auth middleware)
- **Invitation flow**: Creator gets code → shares link (`/register?code=XXX`) → partner registers/logs in → auto-joins couple

## Environment Variables

### Backend (Runtime — Coolify Environment Variables)
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgres://user:pass@host:5432/halo_duo`) — database name is `halo_duo`, not `postgres` |
| `JWT_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `GROQ_API_KEY` | Yes | Groq API key for AI advice generation |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | Google OAuth callback (`https://domain/api/auth/google/callback`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_ID_MONTHLY` | Yes | Stripe monthly price ID |
| `STRIPE_PRICE_ID_YEARLY` | Yes | Stripe yearly price ID |
| `APP_URL` | Yes | App URL for CORS and redirects |
| `OLLAMA_URL` | No | Ollama server URL (e.g. `http://ollama:11434`) — if absent, RAG is disabled |
| `ADMIN_KEY` | No | Key for admin routes (RAG indexation) — sent via `x-admin-key` header |
| `PORT` | No | Backend port (default: 3000, forced via supervisord) |

### Frontend (Build Args — Coolify Build Variables)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL (relative in production) |
| `VITE_GOOGLE_CLIENT_ID` | — | Google OAuth client ID for frontend |
| `VITE_STRIPE_PUBLISHABLE_KEY` | — | Stripe publishable key |

## Database

PostgreSQL with pgvector (`pgvector/pgvector:pg16`). Database name: `halo_duo`. Schema in `backend/sql/init.sql`. Setup script: `backend/sql/setup.sh` (creates DB + all tables, supports clean reset with DROP).

Key tables: `users`, `couples`, `partenaires`, `axes`, `journaux` (daily entries with JSONB scores), `recommandations`, `pdfs`, `chunks_pdf` (768-dim vector embeddings with ivfflat index), `abonnements` (subscriptions).

Full documentation: `docs/database.md`

## AI Integration

- **Groq** (`groq-sdk`): Generates personal advice and couple recommendations using `meta-llama/llama-4-scout-17b-16e-instruct` (temp 0.7, max 500-600 tokens)
- **Ollama** (separate Coolify service): Generates embeddings via `nomic-embed-text` for RAG vector search. Persistent volume: `ollama-data` → `/root/.ollama`
- **RAG**: Supports both PDF and Markdown sources, organized by ethical framework in `backend/data/pdfs/<cadre>/`. Built-in guides are auto-indexed on couple creation. Admin route for batch indexation.
- AI prompts are framework-aware — they reference different therapeutic traditions based on the couple's chosen cadre éthique

## Admin Panel

Admin panel at `/admin` (frontend), protected by `is_admin` boolean on `users` table. All `/api/admin/*` routes require JWT auth + `is_admin = true`.

**Features:**
- **Dashboard** (`/admin`): Stats cards (users, couples, journals today, premium) + RAG indexation trigger + RAG status
- **Utilisateurs** (`/admin/utilisateurs`): User list with plan change (dropdown) and delete
- **Couples** (`/admin/couples`): Couple list with RAG re-index per couple

**Setup:** `ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;` then `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

### Manual DB Access
```bash
psql "postgres://postgres:PASSWORD@voo08kwckkkgwwck40kkooco:5432/halo_duo"
```

## Privacy Invariant

Individual scores must **never** be exposed to the other partner — not in API responses, not in AI-generated text, not in the frontend. The `score_commun` is always an average rounded to 0.5. AI prompts explicitly instruct: never reveal who scored what.

## Known Issues & Warnings

See `docs/audit.md` for the full audit. Key remaining items:
- Privacy leak potential in highlights route (shows which chunks were used for individual advice)
- No rate limiting on auth routes (brute force vulnerable)
- No input validation on register/journal routes
- Tokens in localStorage (acceptable for SPA, mitigated by no XSS)

## Language

The codebase, API endpoints, database columns, and UI are primarily in **French**. Route names, variable names, and comments use French (e.g., `/api/recommandation/tableau`, `conseil_prive`, `cadre_ethique`).
