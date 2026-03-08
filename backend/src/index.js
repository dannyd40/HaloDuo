const express = require('express');
const cors = require('cors');
const passport = require('passport');

const app = express();

// Stripe webhook needs raw body BEFORE json middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(passport.initialize());

// Passport Google OAuth
require('./middleware/passport')(passport);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/journal', require('./routes/journal'));
app.use('/api/recommandation', require('./routes/recommandation'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/stripe', require('./routes/stripe'));
app.use('/api/couple', require('./routes/couple'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Halo Duo' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Halo Duo backend running on port ${PORT}`));
