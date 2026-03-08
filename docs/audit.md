# HaloDuo — Audit Codebase

**Date** : 2026-03-08
**Version** : commit a24d4fc

---

## Résumé

| Catégorie | Total | Corrigé | Restant |
|-----------|-------|---------|---------|
| CRITICAL | 3 | 3 | 0 |
| WARNING | 4 | 1 | 3 |
| INFO | 5 | 0 | 5 |

---

## Issues CRITICAL

### 1. ~~SQL Injection dans INTERVAL~~ ✅ CORRIGÉ

**Fichiers** : `backend/src/routes/journal.js:130`, `backend/src/routes/recommandation.js:129`

**Problème** : Interpolation de variable dans une requête SQL :
```js
// AVANT (dangereux)
`WHERE date_jour >= NOW() - INTERVAL '${limit} days'`
```

**Correction** : Requête paramétrisée :
```js
// APRÈS (sécurisé)
`WHERE date_jour >= NOW() - make_interval(days => $2)`
```

---

### 2. ~~Backend crash sur erreur Groq~~ ✅ CORRIGÉ

**Fichiers** : `backend/src/routes/journal.js:73`, `backend/src/routes/recommandation.js:88`

**Problème** : Une clé Groq invalide ou une erreur réseau faisait crasher tout le processus Node. Supervisord redémarrait le backend en boucle.

**Correction** : Try/catch avec message de fallback :
```js
try {
  conseil_prive = await genererConseilPrive({...});
} catch (err) {
  conseil_prive = 'Le service de conseil est temporairement indisponible.';
}
```

---

### 3. ~~Frontend appelle des routes supprimées~~ ✅ CORRIGÉ

**Fichiers** : `frontend/src/pages/Bibliotheque.jsx`, `frontend/src/pages/PDFViewer.jsx`

**Problème** :
- `Bibliotheque.jsx` appelait `POST /api/pdf/upload` (route supprimée)
- `PDFViewer.jsx` appelait `GET /api/pdf/:id/download` (route supprimée)

**Correction** :
- Supprimé toute la logique d'upload de Bibliotheque.jsx
- Supprimé le bouton télécharger et la fonction handleDownload de PDFViewer.jsx
- Retiré le premium gate (guides accessibles à tous)

---

## Issues WARNING

### 4. Fuite potentielle de vie privée via highlights ⚠️ À CORRIGER

**Fichier** : `backend/src/routes/pdf.js` (route `/:pdfId/highlights`)

**Problème** : La route highlights expose quels chunks RAG ont été utilisés pour les conseils individuels (`conseil_individuel`). Si un partenaire analyse quels passages du guide ont été cités dans les conseils de l'autre, il pourrait en déduire l'état émotionnel de son partenaire.

**Recommandation** : Filtrer les highlights pour ne montrer que ceux issus des recommandations communes (`reco_commune`), pas des conseils individuels.

---

### 5. Pas de rate limiting global ⚠️ À CORRIGER

**Fichier** : `backend/src/index.js`

**Problème** : Aucun rate limiting sur les endpoints publics (`/api/auth/register`, `/api/auth/login`). Vulnérable au brute force.

**Recommandation** : Ajouter `express-rate-limit` sur les routes d'authentification.

---

### 6. Pas de validation des entrées ⚠️ À CORRIGER

**Fichiers** : `backend/src/routes/auth.js`, `backend/src/routes/journal.js`

**Problème** : Pas de validation côté serveur des données entrantes :
- Email non validé au register
- Scores du journal non vérifiés (type, range 1-10, nombre d'axes)
- Prénom du partenaire non sanitisé

**Recommandation** : Ajouter `express-validator` ou validation manuelle sur les routes critiques.

---

### 7. Tokens JWT dans localStorage ⚠️ INFO

**Fichier** : `frontend/src/utils/api.js`, `frontend/src/hooks/useAuth.jsx`

**Problème** : Les tokens sont stockés dans `localStorage` (`hd_access`, `hd_refresh`), ce qui les rend vulnérables au XSS.

**Note** : C'est un pattern courant pour les SPA. L'alternative (httpOnly cookies) nécessiterait des changements backend significatifs. Risque acceptable si pas de faille XSS.

---

## Issues INFO

### 8. Ollama non configuré

**Impact** : Le RAG (recherche vectorielle dans les guides) est désactivé. Les guides éthiques existent mais ne sont pas indexés. Les conseils IA fonctionnent sans enrichissement contextuel.

**Action** : Configurer un service Ollama sur Coolify quand prêt.

---

### 9. Google OAuth non testable en dev local

**Fichier** : `backend/src/middleware/passport.js`

**Problème** : Le callback Google OAuth pointe vers l'URL de production. En dev local, il faudrait un callback `http://localhost:3000/api/auth/google/callback`.

**Recommandation** : Ajouter une config conditionnelle basée sur `NODE_ENV`.

---

### 10. Pas de migration DB

**Problème** : Le schéma est géré par un fichier SQL unique (`init.sql` / `setup.sh`). Pas de système de migrations pour les changements de schéma futurs.

**Recommandation** : Envisager `node-pg-migrate` ou `knex` pour les migrations quand le schéma évoluera.

---

### 11. CRLF warnings sur Git

**Problème** : Tous les fichiers génèrent des warnings `LF will be replaced by CRLF` à chaque commit (dev sur Windows).

**Recommandation** : Ajouter un `.gitattributes` :
```
* text=auto eol=lf
```

---

### 12. Supervisord warning root

**Log** : `CRIT Supervisor is running as root`

**Impact** : Aucun en environnement Docker. C'est un warning standard quand supervisord tourne en root sans `user=` dans la config.

**Recommandation** : Ajouter `user=root` dans `supervisord.conf` pour supprimer le warning, ou créer un user non-root dans le Dockerfile pour plus de sécurité.

---

## Architecture — Points positifs

- Privacy invariant bien respecté dans les routes API
- Séparation claire backend/frontend
- Dockerfile multi-stage efficace
- Gestion des erreurs Groq avec fallback
- Guides éthiques intégrés en Markdown (meilleur que PDF pour le RAG)
- Auto-indexation des guides à la création du couple
- Score commun arrondi à 0.5 (empêche la déduction des scores individuels)

---

## Prochaines étapes recommandées

1. Corriger la fuite privacy dans highlights (WARNING #4)
2. Ajouter rate limiting sur auth (WARNING #5)
3. Ajouter validation des entrées (WARNING #6)
4. Configurer Ollama pour activer le RAG
5. Mettre en place des migrations DB
6. Ajouter `.gitattributes` pour les CRLF
