#!/bin/bash
# Script d'initialisation de la base de données HaloDuo
# Usage: psql -U postgres -f setup.sh
# Ou coller dans le terminal psql

psql -U postgres <<'SQL'
CREATE DATABASE halo_duo;
\c halo_duo

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  nom VARCHAR(100),
  avatar_url TEXT,
  email_verifie BOOLEAN DEFAULT FALSE,
  token_verification VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE abonnements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan VARCHAR(20) DEFAULT 'gratuit',
  statut VARCHAR(20) DEFAULT 'actif',
  date_debut TIMESTAMP,
  date_fin TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_invitation VARCHAR(8) UNIQUE NOT NULL,
  cadre_ethique VARCHAR(20) NOT NULL DEFAULT 'laique',
  created_by UUID REFERENCES users(id),
  date_creation TIMESTAMP DEFAULT NOW()
);

CREATE TABLE partenaires (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  prenom VARCHAR(50) NOT NULL,
  role VARCHAR(10) DEFAULT 'membre',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, couple_id)
);

CREATE TABLE axes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  slug VARCHAR(30) NOT NULL,
  label VARCHAR(50) NOT NULL,
  emoji VARCHAR(5),
  ordre INT DEFAULT 0
);

CREATE TABLE journaux (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partenaire_id UUID REFERENCES partenaires(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  date_jour DATE NOT NULL,
  scores JSONB NOT NULL,
  commentaire TEXT,
  conseil_prive TEXT,
  chunks_utilises JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(partenaire_id, date_jour)
);

CREATE TABLE recommandations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  date_jour DATE NOT NULL,
  score_commun_global NUMERIC(3,1) NOT NULL,
  tendance_direction VARCHAR(5),
  tendance_delta NUMERIC(3,1),
  mode_conseil VARCHAR(25) NOT NULL,
  recommandation TEXT NOT NULL,
  chunks_utilises JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(couple_id, date_jour)
);

CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  cadre VARCHAR(20) NOT NULL,
  taille_bytes INT,
  nb_pages INT,
  nb_chunks INT DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'indexation',
  sections JSONB,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chunks_pdf (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE,
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  cadre VARCHAR(20),
  page INT,
  section_titre VARCHAR(255),
  contenu TEXT NOT NULL,
  contenu_highlight TEXT,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON chunks_pdf USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
SQL

echo "Base halo_duo initialisée avec succès !"
