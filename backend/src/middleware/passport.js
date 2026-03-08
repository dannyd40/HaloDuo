const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

module.exports = (passport) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const { rows } = await db.query(
        'SELECT * FROM users WHERE google_id = $1 OR email = $2',
        [profile.id, email]
      );

      if (rows[0]) {
        // Update google_id if connected via email before
        if (!rows[0].google_id) {
          await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [profile.id, rows[0].id]);
        }
        return done(null, rows[0]);
      }

      // Create new user
      const { rows: newUser } = await db.query(
        `INSERT INTO users (id, email, google_id, nom, avatar_url, email_verifie)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [uuidv4(), email, profile.id, profile.displayName, profile.photos[0]?.value]
      );

      await db.query(
        'INSERT INTO abonnements (id, user_id, plan) VALUES ($1, $2, $3)',
        [uuidv4(), newUser[0].id, 'gratuit']
      );

      done(null, newUser[0]);
    } catch (err) {
      done(err);
    }
  }));
};
