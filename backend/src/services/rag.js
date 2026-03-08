const db = require('../db');

async function genererEmbedding(texte) {
  const res = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: texte }),
  });
  const data = await res.json();
  return data.embedding;
}

async function indexerPDF(pdfBuffer, pdfId, cadre, coupleId) {
  const pdfParse = require('pdf-parse');
  const { text } = await pdfParse(pdfBuffer);
  const mots = text.split(/\s+/);
  const TAILLE = 300, OVERLAP = 50;
  let count = 0;

  for (let i = 0; i < mots.length; i += TAILLE - OVERLAP) {
    const chunk = mots.slice(i, i + TAILLE).join(' ');
    if (chunk.trim().length < 100) continue;
    const embedding = await genererEmbedding(chunk);
    await db.query(
      `INSERT INTO chunks_pdf (id, pdf_id, couple_id, cadre, contenu, embedding)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
      [pdfId, coupleId, cadre, chunk, JSON.stringify(embedding)]
    );
    count++;
  }
  return count;
}

async function rechercherChunks(requete, cadre, coupleId, topK = 3) {
  const embedding = await genererEmbedding(requete);
  const { rows } = await db.query(
    `SELECT id, contenu, page, section_titre
     FROM chunks_pdf
     WHERE couple_id = $1 AND cadre = $2
     ORDER BY embedding <=> $3::vector
     LIMIT $4`,
    [coupleId, cadre, JSON.stringify(embedding), topK]
  );
  return rows;
}

module.exports = { indexerPDF, rechercherChunks, genererEmbedding };
