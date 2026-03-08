# HaloDuo — Modèle de données

## Data Model (diagramme)

```
┌──────────────┐
│    users     │
│──────────────│
│ id (PK)      │
│ email        │
│ password_hash│
│ google_id    │
│ nom          │
│ avatar_url   │
└──────┬───────┘
       │
       │ 1:1                    1:N
       ├─────────────────┐─────────────────┐
       ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ abonnements  │  │   couples    │  │ partenaires  │
│──────────────│  │──────────────│  │──────────────│
│ id (PK)      │  │ id (PK)      │  │ id (PK)      │
│ user_id (FK) │  │ code_invit.  │  │ user_id (FK) │
│ plan         │  │ cadre_ethique│  │ couple_id(FK)│
│ stripe_*     │  │ created_by   │  │ prenom       │
└──────────────┘  │  (FK→users)  │  │ role         │
                  └──────┬───────┘  └──────────────┘
                         │
          ┌──────────────┼──────────────┬──────────────┐
          │ 1:N          │ 1:N          │ 1:N          │ 1:N
          ▼              ▼              ▼              ▼
   ┌──────────────┐┌───────────────┐┌────────┐  ┌──────────┐
   │  journaux    ││recommandations││  axes  │  │   pdfs   │
   │──────────────││───────────────││────────│  │──────────│
   │ id (PK)      ││ id (PK)       ││ id (PK)│  │ id (PK)  │
   │ partenaire_id││ couple_id(FK) ││couple_id│  │couple_id │
   │ couple_id    ││ date_jour     ││ slug   │  │ nom      │
   │ date_jour    ││ score_commun  ││ label  │  │ cadre    │
   │ scores (JSON)││ mode_conseil  ││ emoji  │  │ statut   │
   │ conseil_prive││ recommandation││ ordre  │  └────┬─────┘
   └──────────────┘└───────────────┘└────────┘       │ 1:N
                                                     ▼
                                              ┌────────────┐
                                              │ chunks_pdf │
                                              │────────────│
                                              │ id (PK)    │
                                              │ pdf_id(FK) │
                                              │ couple_id  │
                                              │ contenu    │
                                              │ embedding  │
                                              │  (768-dim) │
                                              └────────────┘
```

## Relations

```
users          1 ──── 1  abonnements      (un user a un abonnement)
users          1 ──── N  partenaires      (un user peut être partenaire dans des couples)
users          1 ──── N  couples          (un user crée des couples via created_by)
couples        1 ──── 2  partenaires      (un couple a exactement 2 partenaires)
couples        1 ──── N  axes             (un couple a ses 7 axes émotionnels)
couples        1 ──── N  journaux         (un couple a des entrées journal quotidiennes)
couples        1 ──── N  recommandations  (un couple reçoit des recommandations quotidiennes)
couples        1 ──── N  pdfs             (un couple peut uploader des PDFs)
partenaires    1 ──── N  journaux         (un partenaire a ses propres entrées journal)
pdfs           1 ──── N  chunks_pdf       (un PDF est découpé en morceaux pour le RAG)
```

---

## Tables détaillées

### 1. `users` — Comptes utilisateurs

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `email` | VARCHAR(255) | Email unique, utilisé pour le login |
| `password_hash` | VARCHAR(255) | Hash bcrypt du mot de passe (null si login Google) |
| `google_id` | VARCHAR(255) | ID Google OAuth (null si login email) |
| `nom` | VARCHAR(100) | Nom affiché |
| `avatar_url` | TEXT | URL de la photo de profil |
| `email_verifie` | BOOLEAN | Email confirmé ou non |
| `token_verification` | VARCHAR(255) | Token envoyé par email pour vérification |
| `reset_password_token` | VARCHAR(255) | Token pour réinitialisation du mot de passe |
| `reset_password_expires` | TIMESTAMP | Expiration du token de reset |
| `created_at` | TIMESTAMP | Date de création du compte |
| `updated_at` | TIMESTAMP | Dernière modification |

**Rôle** : Table centrale d'authentification. Supporte le login par email/mot de passe ET Google OAuth.

---

### 2. `abonnements` — Abonnements Stripe

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `user_id` | UUID (FK→users) | L'utilisateur abonné |
| `stripe_customer_id` | VARCHAR(255) | ID client Stripe (`cus_...`) |
| `stripe_subscription_id` | VARCHAR(255) | ID abonnement Stripe (`sub_...`) |
| `plan` | VARCHAR(20) | `'gratuit'` ou `'premium'` |
| `statut` | VARCHAR(20) | `'actif'`, `'annule'`, `'expire'` |
| `date_debut` | TIMESTAMP | Début de l'abonnement premium |
| `date_fin` | TIMESTAMP | Fin prévue (renouvellement ou expiration) |
| `created_at` | TIMESTAMP | Date de création |
| `updated_at` | TIMESTAMP | Dernière modification |

**Rôle** : Gère le modèle freemium. Les users gratuits ont des limites (3 entrées/semaine, pas de PDF). Les premium ont tout illimité.

---

### 3. `couples` — Couples

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `code_invitation` | VARCHAR(8) | Code à 8 caractères pour inviter le partenaire |
| `cadre_ethique` | VARCHAR(20) | Framework éthique : `laique`, `islam`, `christianisme`, `judaisme`, `bouddhisme` |
| `created_by` | UUID (FK→users) | L'utilisateur qui a créé le couple |
| `date_creation` | TIMESTAMP | Date de création |

**Rôle** : Lie deux partenaires. Le `cadre_ethique` influence les conseils IA générés. Le `code_invitation` permet au 2e partenaire de rejoindre.

---

### 4. `partenaires` — Membres d'un couple

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `user_id` | UUID (FK→users) | Le compte utilisateur |
| `couple_id` | UUID (FK→couples) | Le couple rejoint |
| `prenom` | VARCHAR(50) | Prénom affiché dans l'app |
| `role` | VARCHAR(10) | `'createur'` ou `'membre'` |
| `created_at` | TIMESTAMP | Date d'ajout |

**Rôle** : Table de liaison entre `users` et `couples`. Un couple a toujours exactement 2 partenaires. La contrainte `UNIQUE(user_id, couple_id)` empêche les doublons.

---

### 5. `axes` — Axes émotionnels

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `couple_id` | UUID (FK→couples) | Le couple propriétaire |
| `slug` | VARCHAR(30) | Identifiant technique : `joie`, `colere`, `solitude`, `connexion`, `bien_etre`, `gratitude`, `intimite` |
| `label` | VARCHAR(50) | Nom affiché : "Joie", "Colère", etc. |
| `emoji` | VARCHAR(5) | Emoji associé |
| `ordre` | INT | Ordre d'affichage |

**Rôle** : Définit les 7 dimensions émotionnelles sur lesquelles chaque partenaire se note quotidiennement (1 à 10).

---

### 6. `journaux` — Entrées quotidiennes

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `partenaire_id` | UUID (FK→partenaires) | Le partenaire qui a soumis |
| `couple_id` | UUID (FK→couples) | Le couple concerné |
| `date_jour` | DATE | Date de l'entrée |
| `scores` | JSONB | Les 7 scores : `{"joie": 8, "colere": 2, ...}` |
| `commentaire` | TEXT | Note personnelle optionnelle |
| `conseil_prive` | TEXT | Conseil IA personnalisé (visible UNIQUEMENT par ce partenaire) |
| `chunks_utilises` | JSONB | Références aux chunks PDF utilisés par l'IA |
| `created_at` | TIMESTAMP | Date de création |

**Rôle** : Coeur de l'app. Chaque partenaire soumet ses scores une fois par jour. L'IA génère un `conseil_prive` basé sur les scores. **Les scores individuels ne sont JAMAIS partagés avec l'autre partenaire.**

---

### 7. `recommandations` — Conseils couple partagés

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `couple_id` | UUID (FK→couples) | Le couple concerné |
| `date_jour` | DATE | Date de la recommandation |
| `score_commun_global` | NUMERIC(3,1) | Moyenne anonymisée des 2 partenaires, arrondie à 0.5 |
| `tendance_direction` | VARCHAR(5) | `'up'`, `'down'`, ou `'stable'` |
| `tendance_delta` | NUMERIC(3,1) | Variation par rapport aux 7 derniers jours |
| `mode_conseil` | VARCHAR(25) | Type de conseil : `celebration`, `conseil_doux`, `conseil_asymetrique`, `desamorcage`, `soutien` |
| `recommandation` | TEXT | Conseil IA partagé pour le couple |
| `chunks_utilises` | JSONB | Références aux chunks PDF utilisés |
| `created_at` | TIMESTAMP | Date de création |

**Rôle** : Générée quand les 2 partenaires ont soumis. Le `score_commun_global` est la moyenne arrondie pour empêcher de déduire les scores individuels. Le `mode_conseil` est choisi par `decision.js` selon l'écart et le niveau des scores.

---

### 8. `pdfs` — Documents uploadés (premium)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `couple_id` | UUID (FK→couples) | Le couple propriétaire |
| `nom` | VARCHAR(255) | Nom du fichier |
| `cadre` | VARCHAR(20) | Cadre éthique du document |
| `taille_bytes` | INT | Taille du fichier |
| `nb_pages` | INT | Nombre de pages |
| `nb_chunks` | INT | Nombre de morceaux indexés |
| `statut` | VARCHAR(20) | `'indexation'`, `'pret'`, `'erreur'` |
| `sections` | JSONB | Table des matières extraite |
| `uploaded_at` | TIMESTAMP | Date d'upload |

**Rôle** : Les utilisateurs premium peuvent uploader jusqu'à 5 PDFs (livres, guides thérapeutiques). Ces PDFs enrichissent les conseils IA via la recherche RAG.

---

### 9. `chunks_pdf` — Morceaux de PDF indexés (RAG)

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID (PK) | Identifiant unique |
| `pdf_id` | UUID (FK→pdfs) | Le PDF source |
| `couple_id` | UUID (FK→couples) | Le couple propriétaire |
| `cadre` | VARCHAR(20) | Cadre éthique |
| `page` | INT | Numéro de page source |
| `section_titre` | VARCHAR(255) | Titre de la section |
| `contenu` | TEXT | Texte du morceau (~300 mots) |
| `contenu_highlight` | TEXT | Version avec passages surlignés |
| `embedding` | vector(768) | Vecteur d'embedding (nomic-embed-text via Ollama) |
| `created_at` | TIMESTAMP | Date de création |

**Rôle** : Chaque PDF est découpé en morceaux de ~300 mots avec 50 mots de chevauchement. Chaque morceau est transformé en vecteur 768 dimensions. Lors de la génération de conseils, l'IA cherche les morceaux les plus pertinents par similarité cosinus (index ivfflat).

---

## Flux de données principal

```
1. User s'inscrit          → users + abonnements (plan: gratuit)
2. User crée un couple     → couples + partenaires (role: createur)
3. Partenaire rejoint      → partenaires (role: membre) via code_invitation
4. Axes créés              → axes (7 axes par couple)
5. Partenaire A soumet     → journaux (scores + conseil_prive IA)
6. Partenaire B soumet     → journaux (scores + conseil_prive IA)
7. Les 2 ont soumis        → recommandations (score_commun + conseil partagé)
8. Upload PDF (premium)    → pdfs → chunks_pdf (embedding vectoriel)
9. Conseils enrichis       → journaux.chunks_utilises / recommandations.chunks_utilises
```
