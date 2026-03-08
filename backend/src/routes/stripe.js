const router = require('express').Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY,
  yearly: process.env.STRIPE_PRICE_ID_YEARLY,
};

router.post('/checkout', authenticate, async (req, res) => {
  const { priceId } = req.body;
  const price = PRICE_IDS[priceId];
  if (!price) return res.status(400).json({ error: 'Plan invalide' });

  let { rows } = await db.query(
    'SELECT stripe_customer_id FROM abonnements WHERE user_id = $1', [req.user.id]
  );
  let customerId = rows[0]?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: req.user.email });
    customerId = customer.id;
    await db.query(
      'UPDATE abonnements SET stripe_customer_id = $1 WHERE user_id = $2',
      [customerId, req.user.id]
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.APP_URL}/compte?upgrade=success`,
    cancel_url: `${process.env.APP_URL}/pricing`,
  });

  res.json({ url: session.url });
});

router.post('/portal', authenticate, async (req, res) => {
  const { rows } = await db.query(
    'SELECT stripe_customer_id FROM abonnements WHERE user_id = $1', [req.user.id]
  );
  if (!rows[0]?.stripe_customer_id) return res.status(400).json({ error: 'Pas de compte Stripe' });

  const session = await stripe.billingPortal.sessions.create({
    customer: rows[0].stripe_customer_id,
    return_url: `${process.env.APP_URL}/compte`,
  });
  res.json({ url: session.url });
});

router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await db.query(
        `UPDATE abonnements SET plan = 'premium_monthly', statut = 'actif',
         stripe_subscription_id = $1, date_debut = NOW()
         WHERE stripe_customer_id = $2`,
        [session.subscription, session.customer]
      );
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const plan = sub.items.data[0].price.id === process.env.STRIPE_PRICE_ID_YEARLY
        ? 'premium_yearly' : 'premium_monthly';
      await db.query(
        `UPDATE abonnements SET plan = $1, statut = $2 WHERE stripe_customer_id = $3`,
        [plan, sub.status === 'active' ? 'actif' : sub.status, sub.customer]
      );
      break;
    }
    case 'customer.subscription.deleted': {
      await db.query(
        `UPDATE abonnements SET plan = 'gratuit', statut = 'annule' WHERE stripe_customer_id = $1`,
        [event.data.object.customer]
      );
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
