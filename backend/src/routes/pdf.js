const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// Liste des guides du couple
router.get('/', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  if (!partRows[0]) return res.status(404).json({ error: 'Pas de couple' });

  const { rows } = await db.query(
    'SELECT id, nom, cadre, nb_chunks, statut, uploaded_at FROM pdfs WHERE couple_id = $1 ORDER BY uploaded_at DESC',
    [partRows[0].couple_id]
  );
  res.json({ pdfs: rows });
});

// Contenu d'un guide (chunks)
router.get('/:pdfId/contenu', authenticate, async (req, res) => {
  const { rows: partRows } = await db.query(
    'SELECT couple_id FROM partenaires WHERE user_id = $1', [req.user.id]
  );
  const { rows } = await db.query(
    'SELECT * FROM pdfs WHERE id = $1 AND couple_id = $2',
    [req.params.pdfId, partRows[0]?.couple_id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Guide introuvable' });

  const { rows: chunks } = await db.query(
    'SELECT id, contenu, page, section_titre FROM chunks_pdf WHERE pdf_id = $1 ORDER BY id',
    [req.params.pdfId]
  );
  res.json({ pdf: rows[0], chunks });
});

// Highlights (chunks utilisés par l'IA pour ce couple)
router.get('/:pdfId/highlights', authenticate, async (req, res) => {
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

module.exports = router;
