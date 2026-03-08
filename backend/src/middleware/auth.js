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

    // Si le partenaire du couple est premium, l'autre l'est aussi
    if (req.user.plan === 'gratuit') {
      const { rows: coupleRows } = await db.query(
        `SELECT a.plan FROM partenaires p1
         JOIN partenaires p2 ON p1.couple_id = p2.couple_id AND p1.user_id != p2.user_id
         JOIN abonnements a ON a.user_id = p2.user_id
         WHERE p1.user_id = $1 AND a.plan != 'gratuit'`,
        [decoded.userId]
      );
      if (coupleRows[0]) req.user.plan = coupleRows[0].plan;
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = { authenticate };
