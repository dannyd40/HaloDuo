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

// GET /api/admin/rag — statut de l'indexation RAG
router.get('/rag', async (req, res) => {
  try {
    // Vérifie que les tables existent
    const { rows: tables } = await db.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('pdfs', 'chunks_pdf')`
    );
    const tableNames = tables.map(t => t.table_name);

    if (!tableNames.includes('pdfs') || !tableNames.includes('chunks_pdf')) {
      return res.json({
        total_chunks: 0,
        total_documents: 0,
        couples_indexes: 0,
        couples_total: 0,
        documents: [],
        warning: 'Tables RAG manquantes (pdfs, chunks_pdf)',
      });
    }

    const [totalChunks, pdfs, couplesIndexes, couplesTotal] = await Promise.all([
      db.query('SELECT COUNT(*)::int as count FROM chunks_pdf'),
      db.query(`SELECT p.id, p.nom, p.cadre, p.statut, p.nb_chunks, p.couple_id,
                       c.cadre_ethique
                FROM pdfs p
                LEFT JOIN couples c ON c.id = p.couple_id
                ORDER BY p.nom`),
      db.query('SELECT COUNT(DISTINCT couple_id)::int as count FROM chunks_pdf'),
      db.query('SELECT COUNT(*)::int as count FROM couples'),
    ]);

    res.json({
      total_chunks: totalChunks.rows[0]?.count || 0,
      total_documents: pdfs.rows.length,
      couples_indexes: couplesIndexes.rows[0]?.count || 0,
      couples_total: couplesTotal.rows[0]?.count || 0,
      documents: pdfs.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/indexer — indexer tous les couples
router.post('/indexer', async (req, res) => {
  try {
    console.log('Indexation de tous les couples...');
    const resultats = await indexerTousLesCouples();
    const total = resultats.reduce((s, r) => s + r.chunks, 0);
    console.log(`Indexation terminée: ${total} chunks pour ${resultats.length} couples`);
    res.json({ success: true, total_chunks: total, couples: resultats });
  } catch (err) {
    console.error('Erreur indexation admin:', err.message);
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
