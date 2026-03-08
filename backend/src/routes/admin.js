const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { indexerGuidesIntegres, indexerTousLesCouples } = require('../services/rag');
const db = require('../db');

// Sécurité simple : clé admin dans les headers
const adminGuard = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
};

// POST /api/admin/indexer — indexe les guides pour tous les couples
router.post('/indexer', adminGuard, async (req, res) => {
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

// POST /api/admin/indexer/:coupleId — indexe les guides pour un couple spécifique
router.post('/indexer/:coupleId', adminGuard, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT cadre_ethique FROM couples WHERE id = $1', [req.params.coupleId]);
    if (!rows[0]) return res.status(404).json({ error: 'Couple introuvable' });

    const n = await indexerGuidesIntegres(req.params.coupleId, rows[0].cadre_ethique);
    res.json({ success: true, chunks: n, cadre: rows[0].cadre_ethique });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
