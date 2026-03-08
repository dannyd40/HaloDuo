const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { requirePremium } = require('../middleware/premium');
const { indexerPDF } = require('../services/rag');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Upload PDF (premium only)
router.post('/upload', authenticate, requirePremium, upload.single('pdf'), async (req, res) => {
  const { cadre } = req.body;
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  if (!partRows[0]) return res.status(400).json({ error: 'Pas de couple' });
  const couple_id = partRows[0].couple_id;

  // Limite 5 PDFs
  const { rows: countRows } = await db.query(
    'SELECT COUNT(*) FROM pdfs WHERE couple_id = $1', [couple_id]
  );
  if (parseInt(countRows[0].count) >= 5) {
    return res.status(400).json({ error: 'Limite de 5 PDFs atteinte' });
  }

  const pdfId = uuidv4();
  const filename = `${pdfId}.pdf`;
  const uploadPath = path.join('/app/uploads', filename);
  fs.writeFileSync(uploadPath, req.file.buffer);

  await db.query(
    `INSERT INTO pdfs (id, couple_id, nom, cadre, taille_bytes, statut)
     VALUES ($1,$2,$3,$4,$5,'indexation')`,
    [pdfId, couple_id, req.file.originalname, cadre, req.file.size]
  );

  // Indexation asynchrone
  indexerPDF(req.file.buffer, pdfId, cadre, couple_id)
    .then(async (nbChunks) => {
      await db.query(
        "UPDATE pdfs SET statut = 'pret', nb_chunks = $1 WHERE id = $2",
        [nbChunks, pdfId]
      );
    })
    .catch(async () => {
      await db.query("UPDATE pdfs SET statut = 'erreur' WHERE id = $1", [pdfId]);
    });

  res.json({ pdfId, message: 'PDF en cours d\'indexation…' });
});

// Liste PDFs du couple (premium)
router.get('/', authenticate, requirePremium, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de couple' });

  const { rows } = await db.query(
    'SELECT id, nom, cadre, taille_bytes, nb_chunks, statut, uploaded_at FROM pdfs WHERE couple_id = $1 ORDER BY uploaded_at DESC',
    [partRows[0].couple_id]
  );
  res.json({ pdfs: rows });
});

// Contenu PDF pour le viewer (premium)
router.get('/:pdfId/contenu', authenticate, requirePremium, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  const { rows } = await db.query(
    'SELECT * FROM pdfs WHERE id = $1 AND couple_id = $2',
    [req.params.pdfId, partRows[0]?.couple_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'PDF introuvable' });

  const { rows: chunks } = await db.query(
    'SELECT id, contenu, page, section_titre FROM chunks_pdf WHERE pdf_id = $1 ORDER BY id',
    [req.params.pdfId]
  );
  res.json({ pdf: rows[0], chunks });
});

// Highlights (chunks utilisés par l'IA pour ce couple)
router.get('/:pdfId/highlights', authenticate, requirePremium, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );

  const { rows: journalChunks } = await db.query(
    `SELECT DISTINCT jsonb_array_elements_text(chunks_utilises) as chunk_id,
     j.date_jour, 'conseil_individuel' as contexte
     FROM journaux j JOIN partenaires p ON j.partenaire_id = p.id
     WHERE p.couple_id = $1 AND chunks_utilises IS NOT NULL`,
    [partRows[0]?.couple_id]
  );
  const { rows: recoChunks } = await db.query(
    `SELECT DISTINCT jsonb_array_elements_text(chunks_utilises) as chunk_id,
     date_jour, 'reco_commune' as contexte
     FROM recommandations WHERE couple_id = $1 AND chunks_utilises IS NOT NULL`,
    [partRows[0]?.couple_id]
  );

  const allChunkIds = [...journalChunks, ...recoChunks].map(r => r.chunk_id);
  if (!allChunkIds.length) return res.json({ highlights: [] });

  const { rows: chunks } = await db.query(
    'SELECT id, contenu, page FROM chunks_pdf WHERE id = ANY($1) AND pdf_id = $2',
    [allChunkIds, req.params.pdfId]
  );
  res.json({ highlights: chunks });
});

// Download PDF original (premium, vérifié)
router.get('/:pdfId/download', authenticate, requirePremium, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  const { rows } = await db.query(
    'SELECT * FROM pdfs WHERE id = $1 AND couple_id = $2',
    [req.params.pdfId, partRows[0]?.couple_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'PDF introuvable' });

  const filePath = path.join('/app/uploads', `${req.params.pdfId}.pdf`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier manquant' });

  res.download(filePath, rows[0].nom);
});

module.exports = router;
