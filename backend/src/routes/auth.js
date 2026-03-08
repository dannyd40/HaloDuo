const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const passport = require('passport');
const db = require('../db');

const generateTokens = (userId) => ({
  accessToken: jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' }),
});

// Register
router.post('/register', async (req, res) => {
  const { email, password, nom } = req.body;
  try {
    const hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    await db.query(
      `INSERT INTO users (id, email, password_hash, nom) VALUES ($1, $2, $3, $4)`,
      [userId, email, hash, nom]
    );
    await db.query(
      `INSERT INTO abonnements (id, user_id, plan) VALUES ($1, $2, 'gratuit')`,
      [uuidv4(), userId]
    );
    const tokens = generateTokens(userId);
    res.json(tokens);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email déjà utilisé' });
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0]) return res.status(401).json({ error: 'Identifiants invalides' });
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });
    res.json(generateTokens(rows[0].id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh
router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;
  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET);
    res.json({ accessToken: jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '15m' }) });
  } catch {
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const tokens = generateTokens(req.user.id);
    res.redirect(`${process.env.APP_URL}/auth/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`);
  }
);

// Me
router.get('/me', require('../middleware/auth').authenticate, async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.nom, u.avatar_url, u.is_admin, a.plan
     FROM users u LEFT JOIN abonnements a ON a.user_id = u.id WHERE u.id = $1`,
    [req.user.id]
  );
  // Check if in couple
  const { rows: partRows } = await db.query(
    `SELECT p.id, p.prenom, p.role, c.id as couple_id, c.cadre_ethique, c.code_invitation
     FROM partenaires p JOIN couples c ON p.couple_id = c.id WHERE p.user_id = $1`,
    [req.user.id]
  );

  let partenaire_prenom = null;
  if (partRows[0]) {
    const { rows: otherRows } = await db.query(
      `SELECT prenom FROM partenaires WHERE couple_id = $1 AND user_id != $2`,
      [partRows[0].couple_id, req.user.id]
    );
    partenaire_prenom = otherRows[0]?.prenom || null;
  }

  res.json({
    ...rows[0],
    partenaire: partRows[0] ? { ...partRows[0], partenaire_prenom } : null,
  });
});

module.exports = router;
