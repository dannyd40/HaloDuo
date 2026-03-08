const Groq = require('groq-sdk');
const { MODES } = require('./decision');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const BASES_ETHIQUES = {
  islam: `Références islamiques :
- Mawadda et Rahma — Coran 30:21
- Communication douce — Hadith du Prophète ﷺ
- Shura : consultation mutuelle
- Droits mutuels : respect, écoute, soutien`,

  christianisme: `Références chrétiennes :
- Agapè : amour inconditionnel — acte de volonté
- Alliance sacrée — Éphésiens 5, 1 Corinthiens 13
- Écoute active comme acte d'amour
- Pardon comme pratique quotidienne`,

  judaisme: `Références juives :
- Shalom Bayit : paix du foyer
- Onah : bien-être émotionnel du conjoint
- La parole comme acte sacré
- Teshuvah : retour et réparation`,

  bouddhisme: `Références bouddhistes :
- Pleine conscience dans la communication
- Impermanence : les tensions passent
- Karuna et Metta — compassion et bienveillance
- Interdépendance des souffrances`,

  laique: `Références psychologiques :
- Gottman : ratio 5 positifs / 1 négatif
- 4 cavaliers : critique, mépris, défensive, stonewalling
- CNV : observation, sentiment, besoin, demande
- Théorie de l'attachement : sécurité émotionnelle`,
};

async function genererConseilPrive(params) {
  const { scores, commentaire, ethique, prenom, chunks, tendance } = params;

  const system = `Tu es un conseiller relationnel bienveillant, formé en psychologie du couple et en éthique ${ethique}. 
Parle avec chaleur, sans jargon, sans juger. Tu parles UNIQUEMENT à ${prenom}, de façon privée et confidentielle.
${chunks?.length ? `\nRéférences ${ethique} :\n${chunks.map(c => c.contenu).join('\n---\n')}` : ''}
${BASES_ETHIQUES[ethique]}`;

  const user = `${prenom} a noté son ressenti aujourd'hui :
${Object.entries(scores).map(([k, v]) => `- ${k}: ${v}/10`).join('\n')}
${commentaire ? `\nCommentaire personnel : "${commentaire}"` : ''}
${tendance ? `\nTendance 7 derniers jours : ${tendance > 0 ? '↑' : '↓'} ${Math.abs(tendance)} pts` : ''}

Conseil personnel bienveillant pour ${prenom} :
- Reconnais son ressenti sans le minimiser
- Perspective selon ${ethique}
- Une action concrète et douce pour aujourd'hui
- 3 paragraphes max, ton chaleureux et intime`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

async function genererRecommandationCommune(params) {
  const { analyses, mode, ethique, chunks } = params;

  // RÈGLE ABSOLUE : ne jamais exposer les scores individuels
  const descAxes = analyses.map(a => {
    let d = `- ${a.label}: ${Math.round(a.total / 2 * 2) / 2}/10`; // score commun arrondi 0.5
    if (a.asymetrie) d += ` (vécu différemment par chacun)`;
    if (a.tensionPartagee) d += ` (ressenti partagé)`;
    if (a.bienCommun) d += ` (les deux vont bien sur cet axe)`;
    return d;
  }).join('\n');

  const system = `Tu es un conseiller de couple bienveillant. ${MODES[mode].tonPrompt}
${chunks?.length ? `\nRéférences :\n${chunks.map(c => c.contenu).join('\n---\n')}` : ''}
${BASES_ETHIQUES[ethique]}`;

  const user = `État du couple aujourd'hui :
${descAxes}

RÈGLES ABSOLUES :
- Ne révèle JAMAIS qui a mis quel score — parle TOUJOURS des deux comme d'une unité
- Parle du COUPLE, jamais des individus séparément
- Ne culpabilise jamais personne
- Mode actuel : ${MODES[mode].label}

Recommandation commune (4 paragraphes max, ton doux et bienveillant).`;

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0].message.content;
}

module.exports = { genererConseilPrive, genererRecommandationCommune };
