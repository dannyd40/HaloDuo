const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const AXES_DEFAUT = [
  { slug: 'amusement', label: 'Joie / Amusement', emoji: '😊', ordre: 0 },
  { slug: 'colere', label: 'Colère / Tension', emoji: '😤', ordre: 1 },
  { slug: 'solitude', label: 'Solitude ressentie', emoji: '🌧️', ordre: 2 },
  { slug: 'connexion', label: 'Connexion de couple', emoji: '💞', ordre: 3 },
  { slug: 'bienEtre', label: 'Bien-être personnel', emoji: '🌱', ordre: 4 },
  { slug: 'gratitude', label: 'Gratitude', emoji: '🙏', ordre: 5 },
  { slug: 'intimite', label: 'Intimité émotionnelle', emoji: '❤️', ordre: 6 },
];

// Create couple
router.post('/creer', authenticate, async (req, res) => {
  const { prenom, cadre_ethique = 'laique' } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const coupleId = uuidv4();
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await client.query(
      `INSERT INTO couples (id, code_invitation, cadre_ethique, created_by) VALUES ($1,$2,$3,$4)`,
      [coupleId, code, cadre_ethique, req.user.id]
    );
    const partId = uuidv4();
    await client.query(
      `INSERT INTO partenaires (id, user_id, couple_id, prenom, role) VALUES ($1,$2,$3,$4,'createur')`,
      [partId, req.user.id, coupleId, prenom]
    );
    for (const axe of AXES_DEFAUT) {
      await client.query(
        `INSERT INTO axes (id, couple_id, slug, label, emoji, ordre) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), coupleId, axe.slug, axe.label, axe.emoji, axe.ordre]
      );
    }
    await client.query('COMMIT');
    res.json({ coupleId, code, cadre_ethique });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Join couple
router.post('/rejoindre', authenticate, async (req, res) => {
  const { code, prenom } = req.body;
  const { rows: couples } = await db.query(
    'SELECT * FROM couples WHERE code_invitation = $1', [code.toUpperCase()]
  );
  if (!couples[0]) return res.status(404).json({ error: 'Code invalide' });
  const coupleId = couples[0].id;

  const { rows: existing } = await db.query(
    'SELECT id FROM partenaires WHERE couple_id = $1', [coupleId]
  );
  if (existing.length >= 2) return res.status(400).json({ error: 'Ce couple est déjà complet' });

  const { rows: alreadyIn } = await db.query(
    'SELECT id FROM partenaires WHERE user_id = $1 AND couple_id = $2', [req.user.id, coupleId]
  );
  if (alreadyIn[0]) return res.status(400).json({ error: 'Vous faites déjà partie de ce couple' });

  await db.query(
    `INSERT INTO partenaires (id, user_id, couple_id, prenom, role) VALUES ($1,$2,$3,$4,'membre')`,
    [uuidv4(), req.user.id, coupleId, prenom]
  );
  res.json({ coupleId, cadre_ethique: couples[0].cadre_ethique });
});

// Get couple info
router.get('/info', authenticate, async (req, res) => {
  const { rows: part } = await db.query(
    `SELECT p.*, c.cadre_ethique, c.code_invitation FROM partenaires p
     JOIN couples c ON p.couple_id = c.id WHERE p.user_id = $1`, [req.user.id]
  );
  if (!part[0]) return res.status(404).json({ error: 'Pas de couple' });

  const { rows: axes } = await db.query(
    'SELECT * FROM axes WHERE couple_id = $1 ORDER BY ordre', [part[0].couple_id]
  );

  // Get partner info (prenom only, NO scores)
  const { rows: partenaires } = await db.query(
    `SELECT prenom, role FROM partenaires WHERE couple_id = $1 AND user_id != $2`,
    [part[0].couple_id, req.user.id]
  );

  res.json({
    couple_id: part[0].couple_id,
    cadre_ethique: part[0].cadre_ethique,
    code_invitation: part[0].code_invitation,
    mon_prenom: part[0].prenom,
    partenaire_prenom: partenaires[0]?.prenom || null,
    axes
  });
});

module.exports = router;
