# Admin Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin panel with dashboard stats, user management, and couple management.

**Architecture:** Add `is_admin` boolean to users table, create `adminOnly` middleware, expand admin routes with 6 endpoints, build 3 frontend pages (`/admin`, `/admin/utilisateurs`, `/admin/couples`) using the same crème/doré design system. Admin access is gated by `is_admin` flag loaded in auth middleware.

**Tech Stack:** Express.js (backend), React 18 (frontend), PostgreSQL, existing CSS variables (--cream, --gold, --accent, etc.)

---

### Task 1: Add `is_admin` column to database schema

**Files:**
- Modify: `backend/sql/init.sql:5-18`

**Step 1: Add `is_admin` column to users table in init.sql**

In `backend/sql/init.sql`, add `is_admin` to the `users` CREATE TABLE:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  nom VARCHAR(100),
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  email_verifie BOOLEAN DEFAULT FALSE,
  token_verification VARCHAR(255),
  reset_password_token VARCHAR(255),
  reset_password_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Step 2: Commit**

```bash
git add backend/sql/init.sql
git commit -m "feat: add is_admin column to users table schema"
```

> **Note for production:** Run `ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;` on the live DB, then `UPDATE users SET is_admin = true WHERE email = 'your@email.com';`

---

### Task 2: Load `is_admin` in auth middleware and expose in `/me`

**Files:**
- Modify: `backend/src/middleware/auth.js:10-14`
- Modify: `backend/src/routes/auth.js:72-76`

**Step 1: Update auth middleware query to include `is_admin`**

In `backend/src/middleware/auth.js`, change the SELECT query (line 11) from:

```js
`SELECT u.*, a.plan, a.statut as abonnement_statut
 FROM users u
 LEFT JOIN abonnements a ON a.user_id = u.id
 WHERE u.id = $1`,
```

to:

```js
`SELECT u.*, u.is_admin, a.plan, a.statut as abonnement_statut
 FROM users u
 LEFT JOIN abonnements a ON a.user_id = u.id
 WHERE u.id = $1`,
```

Note: `u.*` already includes `is_admin`, but making it explicit improves readability. The `is_admin` field is now available on `req.user.is_admin`.

**Step 2: Update `/me` endpoint to return `is_admin`**

In `backend/src/routes/auth.js`, change the SELECT query (line 73) from:

```js
`SELECT u.id, u.email, u.nom, u.avatar_url, a.plan
 FROM users u LEFT JOIN abonnements a ON a.user_id = u.id WHERE u.id = $1`,
```

to:

```js
`SELECT u.id, u.email, u.nom, u.avatar_url, u.is_admin, a.plan
 FROM users u LEFT JOIN abonnements a ON a.user_id = u.id WHERE u.id = $1`,
```

**Step 3: Commit**

```bash
git add backend/src/middleware/auth.js backend/src/routes/auth.js
git commit -m "feat: load is_admin in auth middleware and expose in /me"
```

---

### Task 3: Create `adminOnly` middleware and rewrite admin routes

**Files:**
- Modify: `backend/src/routes/admin.js` (full rewrite)

**Step 1: Rewrite admin.js with adminOnly middleware and all 6 endpoints**

Replace the entire content of `backend/src/routes/admin.js` with:

```js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { indexerGuidesIntegres, indexerTousLesCouples } = require('../services/rag');
const db = require('../db');

// Middleware admin : vérifie is_admin sur l'utilisateur authentifié
const adminOnly = (req, res, next) => {
  if (!req.user?.is_admin) return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
};

// Toutes les routes admin nécessitent auth + admin
router.use(authenticate, adminOnly);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [users, couples, journauxAuj, premium] = await Promise.all([
      db.query('SELECT COUNT(*)::int as count FROM users'),
      db.query('SELECT COUNT(*)::int as count FROM couples'),
      db.query('SELECT COUNT(*)::int as count FROM journaux WHERE date_jour = CURRENT_DATE'),
      db.query("SELECT COUNT(*)::int as count FROM abonnements WHERE plan != 'gratuit' AND statut = 'actif'"),
    ]);
    res.json({
      utilisateurs: users.rows[0].count,
      couples: couples.rows[0].count,
      journaux_aujourd_hui: journauxAuj.rows[0].count,
      abonnes_premium: premium.rows[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users?page=1&limit=20
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT u.id, u.email, u.nom, u.is_admin, u.created_at,
              a.plan, a.statut as abonnement_statut,
              p.couple_id, p.prenom
       FROM users u
       LEFT JOIN abonnements a ON a.user_id = u.id
       LEFT JOIN partenaires p ON p.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const { rows: countRows } = await db.query('SELECT COUNT(*)::int as total FROM users');

    res.json({ users: rows, total: countRows[0].total, page, limit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id — modifier le plan
router.patch('/users/:id', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['gratuit', 'mensuel', 'annuel'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide (gratuit, mensuel, annuel)' });
    }
    const { rowCount } = await db.query(
      `UPDATE abonnements SET plan = $1, statut = 'actif', updated_at = NOW() WHERE user_id = $2`,
      [plan, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Abonnement introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
    }
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/couples
router.get('/couples', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.cadre_ethique, c.date_creation,
              json_agg(json_build_object('prenom', p.prenom, 'email', u.email)) as membres,
              (SELECT COUNT(*)::int FROM journaux j WHERE j.couple_id = c.id) as nb_journaux
       FROM couples c
       JOIN partenaires p ON p.couple_id = c.id
       JOIN users u ON u.id = p.user_id
       GROUP BY c.id
       ORDER BY c.date_creation DESC`
    );
    res.json({ couples: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/couples/:id/indexer — relancer indexation RAG
router.post('/couples/:id/indexer', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT cadre_ethique FROM couples WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Couple introuvable' });

    const n = await indexerGuidesIntegres(req.params.id, rows[0].cadre_ethique);
    res.json({ success: true, chunks: n, cadre: rows[0].cadre_ethique });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

**Step 2: Commit**

```bash
git add backend/src/routes/admin.js
git commit -m "feat: rewrite admin routes with is_admin auth and full CRUD"
```

---

### Task 4: Create AdminDashboard page (frontend)

**Files:**
- Create: `frontend/src/pages/admin/Dashboard.jsx`

**Step 1: Create the admin dashboard page**

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';

const TABS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/utilisateurs', label: 'Utilisateurs' },
  { path: '/admin/couples', label: 'Couples' },
];

export function AdminTabs({ current }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 32, background: 'var(--cream-dark)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
      {TABS.map(tab => (
        <Link key={tab.path} to={tab.path}
          style={{
            flex: 1, textAlign: 'center', padding: '10px 16px', borderRadius: 6,
            background: current === tab.path ? 'white' : 'transparent',
            color: current === tab.path ? 'var(--text)' : 'var(--text-muted)',
            textDecoration: 'none', fontSize: 14, fontWeight: 500,
            boxShadow: current === tab.path ? 'var(--shadow)' : 'none',
            transition: 'all 0.2s',
          }}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(err => setError(err.message));
  }, []);

  const cards = stats ? [
    { label: 'Utilisateurs', value: stats.utilisateurs, icon: '👤' },
    { label: 'Couples', value: stats.couples, icon: '💑' },
    { label: 'Journaux aujourd\'hui', value: stats.journaux_aujourd_hui, icon: '📝' },
    { label: 'Abonnés Premium', value: stats.abonnes_premium, icon: '✦' },
  ] : [];

  return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>Gestion de Halo Duo</p>

      <AdminTabs current="/admin" />

      {error && <p style={{ color: '#c44' }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {cards.map(card => (
          <div key={card.label} style={{
            background: 'white', borderRadius: 'var(--radius)', padding: 24,
            boxShadow: 'var(--shadow)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div className="serif" style={{ fontSize: 36, color: 'var(--gold)', fontWeight: 600 }}>{card.value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/admin/Dashboard.jsx
git commit -m "feat: add admin dashboard page with stats cards"
```

---

### Task 5: Create AdminUtilisateurs page (frontend)

**Files:**
- Create: `frontend/src/pages/admin/Utilisateurs.jsx`

**Step 1: Create the users management page**

```jsx
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { AdminTabs } from './Dashboard';

export default function Utilisateurs() {
  const [data, setData] = useState({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = (p = 1) => {
    setLoading(true);
    api(`/admin/users?page=${p}&limit=20`)
      .then(d => { setData(d); setPage(p); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const changePlan = async (userId, plan) => {
    if (!confirm(`Changer le plan en "${plan}" ?`)) return;
    await api(`/admin/users/${userId}`, { method: 'PATCH', body: { plan } });
    fetchUsers(page);
  };

  const deleteUser = async (userId, email) => {
    if (!confirm(`Supprimer ${email} ? Cette action est irréversible.`)) return;
    await api(`/admin/users/${userId}`, { method: 'DELETE' });
    fetchUsers(page);
  };

  const totalPages = Math.ceil(data.total / 20);

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>{data.total} utilisateurs</p>

      <AdminTabs current="/admin/utilisateurs" />

      <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cream-dark)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Nom</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Email</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Plan</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Inscrit le</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '12px 16px' }}>{u.nom || '—'}</td>
                <td style={{ padding: '12px 16px', color: 'var(--text-soft)' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select value={u.plan || 'gratuit'} onChange={e => changePlan(u.id, e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--cream-dark)', fontSize: 13, background: 'white' }}>
                    <option value="gratuit">Gratuit</option>
                    <option value="mensuel">Mensuel</option>
                    <option value="annuel">Annuel</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(u.created_at).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => deleteUser(u.id, u.email)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e8c0c0', background: '#fdf4f4', color: '#c44', fontSize: 12, cursor: 'pointer' }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i + 1} onClick={() => fetchUsers(i + 1)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 13, cursor: 'pointer',
                background: page === i + 1 ? 'var(--gold)' : 'var(--cream-dark)',
                color: page === i + 1 ? 'white' : 'var(--text-soft)',
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/admin/Utilisateurs.jsx
git commit -m "feat: add admin users management page"
```

---

### Task 6: Create AdminCouples page (frontend)

**Files:**
- Create: `frontend/src/pages/admin/Couples.jsx`

**Step 1: Create the couples management page**

```jsx
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { AdminTabs } from './Dashboard';

export default function Couples() {
  const [couples, setCouples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(null);

  useEffect(() => {
    api('/admin/couples').then(d => setCouples(d.couples)).finally(() => setLoading(false));
  }, []);

  const reindexer = async (coupleId) => {
    setIndexing(coupleId);
    try {
      const result = await api(`/admin/couples/${coupleId}/indexer`, { method: 'POST' });
      alert(`Indexation terminée : ${result.chunks} chunks (${result.cadre})`);
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    }
    setIndexing(null);
  };

  return (
    <div className="page-container" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px 100px' }}>
      <h1 className="serif" style={{ fontSize: 28, marginBottom: 8 }}>Administration</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>{couples.length} couples</p>

      <AdminTabs current="/admin/couples" />

      <div style={{ background: 'white', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--cream-dark)', textAlign: 'left' }}>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Membres</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Cadre</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Créé le</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Journaux</th>
              <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {couples.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--cream-dark)' }}>
                <td style={{ padding: '12px 16px' }}>
                  {c.membres.map(m => m.prenom || m.email).join(' & ')}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 100, fontSize: 12, background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    {c.cadre_ethique}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(c.date_creation).toLocaleDateString('fr-FR')}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{c.nb_journaux}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => reindexer(c.id)} disabled={indexing === c.id}
                    style={{
                      padding: '4px 12px', borderRadius: 6, border: '1px solid var(--gold-light)',
                      background: indexing === c.id ? 'var(--cream-dark)' : 'rgba(201,168,76,0.08)',
                      color: 'var(--gold)', fontSize: 12, cursor: indexing === c.id ? 'wait' : 'pointer',
                    }}>
                    {indexing === c.id ? 'Indexation...' : 'Re-indexer RAG'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/admin/Couples.jsx
git commit -m "feat: add admin couples management page"
```

---

### Task 7: Add admin routes and nav link in frontend

**Files:**
- Modify: `frontend/src/App.jsx:1-49`
- Modify: `frontend/src/components/Nav.jsx:1-47`

**Step 1: Add admin routes to App.jsx**

In `frontend/src/App.jsx`, add imports after line 15:

```jsx
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminUtilisateurs from './pages/admin/Utilisateurs.jsx';
import AdminCouples from './pages/admin/Couples.jsx';
```

Add an `AdminRoute` component after the `ProtectedRoute` component (after line 23):

```jsx
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#A89880' }}>Halo Duo…</div>;
  if (!user) return <Navigate to="/login" />;
  if (!user.is_admin) return <Navigate to="/tableau" />;
  return children;
}
```

Add admin routes inside `<Routes>`, after the `/compte` route (after line 45):

```jsx
<Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
<Route path="/admin/utilisateurs" element={<AdminRoute><AdminUtilisateurs /></AdminRoute>} />
<Route path="/admin/couples" element={<AdminRoute><AdminCouples /></AdminRoute>} />
```

**Step 2: Add admin link to Navbar in Nav.jsx**

In `frontend/src/components/Nav.jsx`, modify the `Navbar` component (line 12-20) to add an admin link:

```jsx
export function Navbar() {
  const { user } = useAuth();
  return (
    <nav className="navbar">
      <Link to="/tableau" className="logo">Halo <span>Duo</span></Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user?.is_admin && (
          <Link to="/admin" style={{ fontSize: 11, color: 'var(--gold)', background: 'rgba(201,168,76,0.1)', padding: '3px 10px', borderRadius: 100, textDecoration: 'none' }}>
            Admin
          </Link>
        )}
        {user && <BadgePlan plan={user.plan} />}
      </div>
    </nav>
  );
}
```

**Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Nav.jsx
git commit -m "feat: add admin routes and nav link for admin users"
```

---

### Task 8: Final verification

**Step 1: Run backend locally to check for syntax errors**

```bash
cd backend && node -e "require('./src/routes/admin.js')" && echo "OK"
```

Expected: `OK` (no syntax errors)

**Step 2: Run frontend build to check for import errors**

```bash
cd frontend && npm run build
```

Expected: Build succeeds

**Step 3: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: admin panel complete — dashboard, users, couples management"
```
