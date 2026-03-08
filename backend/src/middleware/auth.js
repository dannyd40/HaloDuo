const jwt = require('jsonwebtoken');
const db = require('../db');

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token manquant' });

  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const { rows } = await db.query(
      `SELECT u.*, a.plan, a.statut as abonnement_statut
       FROM users u
       LEFT JOIN abonnements a ON a.user_id = u.id
       WHERE u.id = $1`,
      [decoded.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'Utilisateur introuvable' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = { authenticate };
