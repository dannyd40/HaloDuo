const requirePremium = (req, res, next) => {
  if (req.user.plan === 'gratuit') {
    return res.status(403).json({
      error: 'premium_required',
      message: 'Cette fonctionnalité nécessite un abonnement Halo Duo Premium'
    });
  }
  next();
};

module.exports = { requirePremium };
