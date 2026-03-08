const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { analyserAxe, choisirMode, scoreCommun, calculerTendance } = require('../services/decision');
const { genererRecommandationCommune } = require('../services/groq');
const { rechercherChunks } = require('../services/rag');

// Tableau du jour — score commun anonymisé
router.get('/tableau', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    `SELECT p.*, c.cadre_ethique FROM partenaires p
     JOIN couples c ON p.couple_id = c.id WHERE p.user_id = $1`, [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de couple' });

  const couple_id = partRows[0].couple_id;
  const today = new Date().toISOString().split('T')[0];

  // Récupérer les deux journaux du jour
  const { rows: journaux } = await db.query(
    `SELECT j.scores, j.partenaire_id, p.user_id FROM journaux j
     JOIN partenaires p ON j.partenaire_id = p.id
     WHERE j.couple_id = $1 AND j.date_jour = $2`,
    [couple_id, today]
  );

  const monJournal = journaux.find(j => j.user_id === req.user.id);
  const partenaireJournal = journaux.find(j => j.user_id !== req.user.id);

  // DÉLAI : n'afficher le score commun que si les DEUX ont soumis
  const deuxOntSoumis = journaux.length === 2;

  if (!deuxOntSoumis) {
    return res.json({
      attente: true,
      mon_journal_soumis: !!monJournal,
      message: monJournal
        ? 'En attente du journal de votre partenaire…'
        : 'Complétez votre journal pour débloquer le tableau du jour',
    });
  }

  // Les deux ont soumis — calculer score commun
  const { rows: axes } = await db.query(
    'SELECT * FROM axes WHERE couple_id = $1 ORDER BY ordre', [couple_id]
  );

  const scoresA = monJournal.scores;
  const scoresB = partenaireJournal.scores;

  // Score global arrondi à 0.5 — jamais de détail par axe dans la vue commune
  const scoreCommunGlobal = scoreCommun(scoresA, scoresB, axes);

  // Tendance 7j (scores communs précédents)
  const { rows: histRows } = await db.query(
    `SELECT score_commun_global FROM recommandations
     WHERE couple_id = $1 AND date_jour >= NOW() - INTERVAL '7 days'
     ORDER BY date_jour DESC`,
    [couple_id]
  );
  const historique7j = histRows.map(r => parseFloat(r.score_commun_global));
  const tendance = calculerTendance(scoreCommunGlobal, historique7j);

  // Vérif recommandation déjà générée
  const { rows: recoRows } = await db.query(
    'SELECT * FROM recommandations WHERE couple_id = $1 AND date_jour = $2',
    [couple_id, today]
  );

  let reco = recoRows[0];

  if (!reco) {
    // Générer recommandation commune
    const analyses = axes.map(axe =>
      analyserAxe(scoresA[axe.slug] ?? 5, scoresB[axe.slug] ?? 5, axe.label)
    );
    const mode = choisirMode(analyses, historique7j.length > 0 ? historique7j[0] : null);

    const { rows: coupleInfo } = await db.query(
      'SELECT cadre_ethique FROM couples WHERE id = $1', [couple_id]
    );
    const ethique = coupleInfo[0].cadre_ethique;

    const requeteRAG = `Conseil couple mode ${mode}: ${analyses.map(a => `${a.label} ${a.total}/20`).join(', ')}`;
    const chunks = await rechercherChunks(requeteRAG, ethique, couple_id).catch(() => []);

    let recommandation;
    try {
      recommandation = await genererRecommandationCommune({ analyses, mode, ethique, chunks });
    } catch (err) {
      console.error('Erreur génération recommandation:', err.message);
      recommandation = 'Le service de recommandation est temporairement indisponible. Votre score commun a été calculé.';
    }

    const { rows: newReco } = await db.query(
      `INSERT INTO recommandations (id, couple_id, date_jour, score_commun_global, tendance_direction, tendance_delta, mode_conseil, recommandation, chunks_utilises)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [uuidv4(), couple_id, today, scoreCommunGlobal, tendance.direction, tendance.delta, mode, recommandation, JSON.stringify(chunks.map(c => c.id))]
    );
    reco = newReco[0];
  }

  res.json({
    attente: false,
    score_commun: parseFloat(reco.score_commun_global), // /10 arrondi 0.5
    tendance: {
      direction: reco.tendance_direction, // 'up' | 'down' | 'stable'
      delta: parseFloat(reco.tendance_delta),
    },
    mode: reco.mode_conseil,
    recommandation: reco.recommandation,
    // PAS de scores par axe — PAS de scores individuels
  });
});

// Historique des recommandations communes (tendance uniquement)
router.get('/historique', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    `SELECT couple_id FROM partenaires WHERE user_id = $1`, [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de couple' });

  const limit = req.user.plan === 'gratuit' ? 7 : 90;
  const { rows } = await db.query(
    `SELECT date_jour, score_commun_global, tendance_direction, tendance_delta, mode_conseil
     FROM recommandations
     WHERE couple_id = $1 AND date_jour >= NOW() - make_interval(days => $2)
     ORDER BY date_jour DESC`,
    [partRows[0].couple_id, limit]
  );

  // Retourner seulement direction + score arrondi, pas les détails par axe
  res.json({
    historique: rows.map(r => ({
      date: r.date_jour,
      score: parseFloat(r.score_commun_global),
      tendance: r.tendance_direction,
      mode: r.mode_conseil,
    })),
    limit_jours: limit,
  });
});

module.exports = router;
