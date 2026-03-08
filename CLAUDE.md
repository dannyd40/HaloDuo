# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HaloDuo is a couple wellness app — partners independently log daily emotional scores across 7 axes (Joy, Anger, Solitude, Connection, Well-being, Gratitude, Intimacy), then receive private AI advice and a shared anonymized couple recommendation. Individual scores are **never** revealed to the other partner. The app supports 5 ethical frameworks (laïque, islam, christianisme, judaïsme, bouddhisme) that influence AI-generated advice. Freemium model with Stripe billing.

## Architecture

Monorepo with 4 services orchestrated via Docker Compose:

- **backend/** — Express.js (CommonJS) REST API on port 3000
- **frontend/** — React 18 SPA with Vite on port 5173
- **postgres** — PostgreSQL 16 with pgvector extension (768-dim embeddings)
- **ollama** — Local embedding model (`nomic-embed-text`) for RAG
- **nginx** — Reverse proxy: `/api` → backend, `/` → frontend

## Development Commands

```bash
# Full stack via Docker
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
├── index.js          # Express app, route mounting, Stripe raw body handling
├── db.js             # pg Pool connection
├── middleware/
│   ├── auth.js       # JWT verification, attaches req.user with plan info
│   ├── passport.js   # Google OAuth 2.0 strategy
│   └── premium.js    # 403 gate for free-plan users
├── routes/
│   ├── auth.js       # Register, login, refresh, Google OAuth, /me
│   ├── journal.js    # Daily scores + private AI advice (rate-limited: 3/week free)
│   ├── recommandation.js  # Couple dashboard score + shared AI recommendation
│   ├── couple.js     # Create/join couple, invitation codes
│   ├── stripe.js     # Checkout, portal, webhook
│   └── pdf.js        # Upload, list, view, download (premium only, max 5)
└── services/
    ├── groq.js       # Groq API (llama-4-scout), personal + couple advice generation
    ├── rag.js        # PDF chunking (300 words, 50 overlap), Ollama embeddings, vector search
    └── decision.js   # Score analysis, mode selection, trend calculation
```

API routes are all under `/api`. Stripe webhook route must receive raw body (parsed before JSON middleware in index.js).

## Frontend Structure

```
frontend/src/
├── App.jsx           # BrowserRouter, AuthProvider, route definitions
├── main.jsx          # React root render
├── index.css         # Global styles, CSS variables (--cream, --accent, --gold)
├── hooks/useAuth.jsx # AuthProvider context: login, register, logout, token refresh
├── utils/api.js      # Fetch wrapper: auto Bearer token, 401 retry with refresh
├── components/
│   ├── Nav.jsx       # Navbar + BottomNav (5 tabs) + BadgePlan
│   └── Freemium.jsx  # BannerFreemium + ModalUpgrade (Stripe checkout)
└── pages/
    ├── Journal.jsx, Conseil.jsx         # Personal: score entry + private advice
    ├── Tableau.jsx, Recommandation.jsx  # Couple: shared dashboard + recommendation
    ├── Bibliotheque.jsx, PDFViewer.jsx  # Premium: PDF library with RAG highlights
    ├── Onboarding.jsx                   # Create/join couple + ethical framework
    ├── Compte.jsx                       # Account + subscription management
    ├── Landing.jsx, Login.jsx, Register.jsx, Pricing.jsx  # Public pages
```

State management: React Context (useAuth) for auth state; local useState in each page. No Redux/Zustand. Tokens stored in localStorage (`hd_access`, `hd_refresh`).

## Key Domain Concepts

- **Axes**: 7 emotional dimensions scored 1-10 per partner per day
- **Score commun**: Anonymized couple average, rounded to nearest 0.5 (prevents deduction of individual scores)
- **Conseil modes**: `celebration`, `conseil_doux`, `conseil_asymetrique`, `desamorcage`, `soutien` — selected by `decision.js` based on score patterns
- **Cadre éthique**: Ethical framework that shapes AI prompts and PDF filtering
- **Partenaire**: A user linked to a couple; roles are `createur` or `membre`
- Both partners must submit before the couple dashboard reveals the day's shared score

## Database

PostgreSQL with pgvector. Schema in `backend/sql/init.sql`. Key tables: `users`, `couples`, `partenaires`, `axes`, `journaux` (daily entries with JSONB scores), `recommandations`, `pdfs`, `chunks_pdf` (768-dim vector embeddings with ivfflat index), `abonnements` (subscriptions).

## AI Integration

- **Groq** (`groq-sdk`): Generates personal advice and couple recommendations using `meta-llama/llama-4-scout-17b-16e-instruct` (temp 0.7, max 500-600 tokens)
- **Ollama** (local): Generates embeddings via `nomic-embed-text` for RAG vector search
- AI prompts are framework-aware — they reference different therapeutic traditions based on the couple's chosen cadre éthique

## Privacy Invariant

Individual scores must **never** be exposed to the other partner — not in API responses, not in AI-generated text, not in the frontend. The `score_commun` is always an average rounded to 0.5. AI prompts explicitly instruct: never reveal who scored what.

## Language

The codebase, API endpoints, database columns, and UI are primarily in **French**. Route names, variable names, and comments use French (e.g., `/api/recommandation/tableau`, `conseil_prive`, `cadre_ethique`).
