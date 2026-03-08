const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { startOfWeek } = require('date-fns');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { genererConseilPrive } = require('../services/groq');
const { rechercherChunks } = require('../services/rag');

// Vérifier limite IA plan gratuit
async function verifierLimiteIA(userId) {
  const { rows: abRows } = await db.query(
    'SELECT plan FROM abonnements WHERE user_id = $1', [userId]
  );
  if (!abRows[0] || abRows[0].plan !== 'gratuit') return { autorise: true };

  const debutSemaine = startOfWeek(new Date(), { weekStartsOn: 1 });
  const { rows } = await db.query(
    `SELECT COUNT(*) FROM journaux j
     JOIN partenaires p ON j.partenaire_id = p.id
     WHERE p.user_id = $1 AND j.conseil_prive IS NOT NULL AND j.created_at >= $2`,
    [userId, debutSemaine]
  );
  const count = parseInt(rows[0].count);
  return {
    autorise: count < 3,
    restants: Math.max(0, 3 - count),
    message: count >= 3 ? 'Limite de 3 conseils IA/semaine atteinte — passez en Premium' : null,
  };
}

// Soumettre journal du jour
router.post('/', authenticate, async (req, res) => {
  const { scores, commentaire } = req.body;

  const { rows: partRows } = await db.query(
    `SELECT p.*, c.cadre_ethique FROM partenaires p
     JOIN couples c ON p.couple_id = c.id WHERE p.user_id = $1`,
    [req.user.id]
  );
  if (!partRows[0]) return res.status(400).json({ error: 'Pas de couple lié' });

  const partenaire = partRows[0];
  const today = new Date().toISOString().split('T')[0];

  // Vérifier déjà soumis aujourd'hui
  const { rows: existing } = await db.query(
    'SELECT id FROM journaux WHERE partenaire_id = $1 AND date_jour = $2',
    [partenaire.id, today]
  );
  if (existing[0]) return res.status(400).json({ error: 'Journal déjà soumis aujourd\'hui' });

  // Vérifier limite IA
  const limite = await verifierLimiteIA(req.user.id);

  let conseil_prive = null;
  let chunksUtilises = null;

  if (limite.autorise) {
    // RAG : chercher passages pertinents
    const requeteRAG = `Ressenti aujourd'hui : ${Object.entries(scores).map(([k,v]) => `${k} ${v}/10`).join(', ')}`;
    const chunks = await rechercherChunks(requeteRAG, partenaire.cadre_ethique, partenaire.couple_id).catch(() => []);

    // Tendance 7j
    const { rows: tendRows } = await db.query(
      `SELECT scores FROM journaux WHERE partenaire_id = $1 AND date_jour >= NOW() - INTERVAL '7 days'
       ORDER BY date_jour DESC`,
      [partenaire.id]
    );
    const tendance7j = tendRows.length > 0
      ? tendRows.map(r => Object.values(r.scores).reduce((s,v) => s+v, 0) / Object.values(r.scores).length).reduce((s,v) => s+v, 0) / tendRows.length
      : null;

    try {
      conseil_prive = await genererConseilPrive({
        scores,
        commentaire,
        ethique: partenaire.cadre_ethique,
        prenom: partenaire.prenom,
        chunks,
        tendance: tendance7j,
      });
    } catch (err) {
      console.error('Erreur génération conseil:', err.message);
      conseil_prive = 'Le service de conseil est temporairement indisponible. Vos scores ont été enregistrés.';
    }

    chunksUtilises = chunks.map(c => c.id);
  }

  await db.query(
    `INSERT INTO journaux (id, partenaire_id, couple_id, date_jour, scores, commentaire, conseil_prive, chunks_utilises)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [uuidv4(), partenaire.id, partenaire.couple_id, today, JSON.stringify(scores), commentaire, conseil_prive, JSON.stringify(chunksUtilises)]
  );

  res.json({
    conseil_prive,
    limite: { restants: limite.restants ?? null, message: limite.message },
  });
});

// Récupérer mon journal du jour (PRIVÉ — uniquement mes scores)
router.get('/aujourd-hui', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de partenaire' });

  const today = new Date().toISOString().split('T')[0];
  const { rows } = await db.query(
    'SELECT scores, commentaire, conseil_prive, created_at FROM journaux WHERE partenaire_id = $1 AND date_jour = $2',
    [partRows[0].id, today]
  );

  res.json({ journal: rows[0] || null });
});

// Historique PRIVÉ (mes entrées uniquement)
router.get('/historique', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    `SELECT p.id, a.plan FROM partenaires p
     JOIN abonnements a ON a.user_id = p.user_id
     WHERE p.user_id = $1`, [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de partenaire' });

  const limit = partRows[0].plan === 'gratuit' ? 7 : 90;
  const { rows } = await db.query(
    `SELECT date_jour, scores, conseil_prive FROM journaux
     WHERE partenaire_id = $1 AND date_jour >= NOW() - INTERVAL '${limit} days'
     ORDER BY date_jour DESC`,
    [partRows[0].id]
  );
  res.json({ journaux: rows, limit_jours: limit });
});

module.exports = router;
