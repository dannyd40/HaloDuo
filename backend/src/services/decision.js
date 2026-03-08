function analyserAxe(scoreA, scoreB, label) {
  const total = scoreA + scoreB; // /20
  const ecart = Math.abs(scoreA - scoreB);
  return {
    label,
    total,
    ecart,
    scoreMin: Math.min(scoreA, scoreB),
    scoreMax: Math.max(scoreA, scoreB),
    asymetrie: ecart >= 4,
    crisePrive: Math.max(scoreA, scoreB) >= 7,
    bienCommun: Math.min(scoreA, scoreB) >= 7,
    tensionPartagee: Math.min(scoreA, scoreB) >= 6 && ecart <= 2,
  };
}

function choisirMode(analyses, tendance7j) {
  const axesCrise = analyses.filter(a => a.crisePrive && a.asymetrie);
  const axesTension = analyses.filter(a => a.tensionPartagee && a.total >= 12);
  const axesBien = analyses.filter(a => a.bienCommun);
  const totalMoyen = analyses.reduce((s, a) => s + a.total, 0) / analyses.length;
  const tendanceNeg = tendance7j && (totalMoyen < tendance7j - 2);

  if (axesCrise.length >= 2) return 'soutien';
  if (axesTension.length >= 2) return 'desamorcage';
  if (axesCrise.length === 1) return 'conseil_asymetrique';
  if (axesBien.length >= analyses.length * 0.7 && !tendanceNeg) return 'celebration';
  return 'conseil_doux';
}

/**
 * Calcul score commun affiché : (A+B)/2 arrondi à 0.5
 * Rend impossible de déduire le score individuel précis
 */
function scoreCommun(scoresA, scoresB, axes) {
  const vals = axes.map(axe => {
    const a = scoresA[axe.slug] ?? 5;
    const b = scoresB[axe.slug] ?? 5;
    return (a + b) / 2;
  });
  const moyenne = vals.reduce((s, v) => s + v, 0) / vals.length;
  // Arrondi à 0.5 — empêche la déduction du score individuel
  return Math.round(moyenne * 2) / 2;
}

function calculerTendance(scoreAujourdhui, historique7j) {
  if (!historique7j || historique7j.length === 0) return { direction: 'stable', delta: 0 };
  const moyenne7j = historique7j.reduce((s, v) => s + v, 0) / historique7j.length;
  const delta = Math.round((scoreAujourdhui - moyenne7j) * 2) / 2;
  const direction = delta > 0.4 ? 'up' : delta < -0.4 ? 'down' : 'stable';
  return { direction, delta: Math.abs(delta) };
}

const MODES = {
  celebration: { label: '✨ Célébration', tonPrompt: 'Ton joyeux et valorisant. NE PAS donner de conseils, juste célébrer.' },
  conseil_doux: { label: '💡 Conseil doux', tonPrompt: 'Ton doux, suggestion légère et bienveillante.' },
  conseil_asymetrique: { label: '🔄 Reconnexion', tonPrompt: 'Reconnexion douce, parle du couple sans jamais désigner un individu.' },
  desamorcage: { label: '🌊 Désamorçage', tonPrompt: 'Calme, technique concrète et immédiate pour désamorcer la tension.' },
  soutien: { label: '🫂 Soutien', tonPrompt: 'Très doux, une seule action simple. Beaucoup d\'empathie.' },
};

module.exports = { analyserAxe, choisirMode, scoreCommun, calculerTendance, MODES };
