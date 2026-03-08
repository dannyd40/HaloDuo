const db = require('../db');
const fs = require('fs');
const path = require('path');

async function genererEmbedding(texte) {
  const res = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', prompt: texte }),
  });
  const data = await res.json();
  return data.embedding;
}

// Découpe un texte en chunks de ~TAILLE mots avec OVERLAP
function decouper(texte, taille = 300, overlap = 50) {
  const mots = texte.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < mots.length; i += taille - overlap) {
    const chunk = mots.slice(i, i + taille).join(' ');
    if (chunk.trim().length < 100) continue;
    chunks.push(chunk);
  }
  return chunks;
}

// Extrait les sections d'un fichier Markdown
function parserMarkdown(texte) {
  const sections = [];
  let currentTitle = '';
  let currentContent = '';

  for (const line of texte.split('\n')) {
    const match = line.match(/^#{1,3}\s+(.+)/);
    if (match) {
      if (currentContent.trim()) {
        sections.push({ titre: currentTitle, contenu: currentContent.trim() });
      }
      currentTitle = match[1];
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  }
  if (currentContent.trim()) {
    sections.push({ titre: currentTitle, contenu: currentContent.trim() });
  }
  return sections;
}

async function indexerTexte(texte, pdfId, cadre, coupleId, sections = null) {
  const chunks = decouper(texte);
  let count = 0;

  for (const chunk of chunks) {
    const sectionTitre = sections
      ? (sections.find(s => chunk.includes(s.contenu.substring(0, 50)))?.titre || null)
      : null;
    const embedding = await genererEmbedding(chunk);
    await db.query(
      `INSERT INTO chunks_pdf (id, pdf_id, couple_id, cadre, section_titre, contenu, embedding)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6)`,
      [pdfId, coupleId, cadre, sectionTitre, chunk, JSON.stringify(embedding)]
    );
    count++;
  }
  return count;
}

async function indexerPDF(pdfBuffer, pdfId, cadre, coupleId) {
  const pdfParse = require('pdf-parse');
  const { text } = await pdfParse(pdfBuffer);
  return indexerTexte(text, pdfId, cadre, coupleId);
}

async function indexerMarkdown(filePath, pdfId, cadre, coupleId) {
  const texte = fs.readFileSync(filePath, 'utf-8');
  const sections = parserMarkdown(texte);
  return indexerTexte(texte, pdfId, cadre, coupleId, sections);
}

// Indexe un fichier unique (.md ou .pdf) pour un couple
async function indexerFichier(filePath, nom, cadre, coupleId) {
  // Vérifie si déjà indexé pour ce couple
  const { rows } = await db.query(
    "SELECT id FROM pdfs WHERE couple_id = $1 AND nom = $2",
    [coupleId, nom]
  );
  if (rows.length > 0) return 0;

  const { rows: pdfRows } = await db.query(
    `INSERT INTO pdfs (id, couple_id, nom, cadre, statut)
     VALUES (uuid_generate_v4(), $1, $2, $3, 'indexation')
     RETURNING id`,
    [coupleId, nom, cadre]
  );
  const pdfId = pdfRows[0].id;

  try {
    let nbChunks;
    if (filePath.endsWith('.md')) {
      nbChunks = await indexerMarkdown(filePath, pdfId, cadre, coupleId);
    } else if (filePath.endsWith('.pdf')) {
      const buffer = fs.readFileSync(filePath);
      nbChunks = await indexerPDF(buffer, pdfId, cadre, coupleId);
    } else {
      return 0;
    }
    await db.query(
      "UPDATE pdfs SET statut = 'pret', nb_chunks = $1 WHERE id = $2",
      [nbChunks, pdfId]
    );
    return nbChunks;
  } catch (err) {
    await db.query("UPDATE pdfs SET statut = 'erreur' WHERE id = $1", [pdfId]);
    console.error(`Erreur indexation ${nom}:`, err.message);
    return 0;
  }
}

// Indexe tous les guides du dossier correspondant au cadre éthique
async function indexerGuidesIntegres(coupleId, cadre) {
  const cadreDir = path.join(__dirname, '..', '..', 'data', 'pdfs', cadre);
  if (!fs.existsSync(cadreDir)) return 0;

  const fichiers = fs.readdirSync(cadreDir).filter(f => f.endsWith('.md') || f.endsWith('.pdf'));
  let total = 0;

  for (const fichier of fichiers) {
    const filePath = path.join(cadreDir, fichier);
    const n = await indexerFichier(filePath, fichier, cadre, coupleId);
    if (n > 0) console.log(`  Indexé ${fichier}: ${n} chunks`);
    total += n;
  }
  return total;
}

// Indexe les guides pour TOUS les couples existants
async function indexerTousLesCouples() {
  const { rows: couples } = await db.query('SELECT id, cadre_ethique FROM couples');
  const resultats = [];

  for (const couple of couples) {
    const n = await indexerGuidesIntegres(couple.id, couple.cadre_ethique);
    resultats.push({ couple_id: couple.id, cadre: couple.cadre_ethique, chunks: n });
  }
  return resultats;
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

module.exports = { indexerPDF, indexerMarkdown, indexerGuidesIntegres, indexerTousLesCouples, rechercherChunks, genererEmbedding };
