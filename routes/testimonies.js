const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/testimonies', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, title, story, image_url, pdf_url, source, created_at FROM testimonies WHERE status = 'approved' ORDER BY created_at DESC"
  );
  res.json(rows);
});

router.get('/testimonies/:id', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, title, story, image_url, pdf_url, source, created_at FROM testimonies WHERE id = $1 AND status = 'approved'",
    [req.params.id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Svjedočanstvo nije pronađeno.' });
  res.json(row);
});

router.post('/testimonies', async (req, res) => {
  const { name, email, story } = req.body || {};
  if (!story || !story.trim()) {
    return res.status(400).json({ error: 'Svjedočanstvo ne smije biti prazno.' });
  }
  await db.query(
    "INSERT INTO testimonies (name, email, story, status, source) VALUES ($1, $2, $3, 'pending', 'user')",
    [name || '', email || '', story.trim()]
  );
  res.json({ ok: true, message: 'Hvala što ste podijelili svoje svjedočanstvo! Bit će objavljeno nakon pregleda.' });
});

router.get('/admin/testimonies', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM testimonies ORDER BY created_at DESC');
  res.json(rows);
});

// --- Admin: dodaj svjedočanstvo koje Marija sama upisuje (odmah objavljeno/skriveno po volji) ---
// Svjedočanstvo je ili napisan tekst (story) ili uploadani PDF (pdf_url) — jedno od to dvoje mora postojati.
router.post('/admin/testimonies', requireAdmin, async (req, res) => {
  const { name, title, story, image_url, pdf_url, published } = req.body || {};
  const trimmedStory = (story || '').trim();
  if (!trimmedStory && !pdf_url) {
    return res.status(400).json({ error: 'Upišite tekst svjedočanstva ili uploadajte PDF.' });
  }
  const { rows } = await db.query(
    "INSERT INTO testimonies (name, title, story, image_url, pdf_url, status, source) VALUES ($1, $2, $3, $4, $5, $6, 'admin') RETURNING id",
    [name || '', title || '', trimmedStory, image_url || '', pdf_url || '', published ? 'approved' : 'pending']
  );
  res.json({ id: rows[0].id });
});

// --- Admin: uredi bilo koje svjedočanstvo (i vlastito i korisničko) ---
router.put('/admin/testimonies/:id', requireAdmin, async (req, res) => {
  const { name, title, story, image_url, pdf_url, published } = req.body || {};
  const trimmedStory = (story || '').trim();
  if (!trimmedStory && !pdf_url) {
    return res.status(400).json({ error: 'Upišite tekst svjedočanstva ili uploadajte PDF.' });
  }
  await db.query(
    'UPDATE testimonies SET name=$1, title=$2, story=$3, image_url=$4, pdf_url=$5, status=$6 WHERE id=$7',
    [name || '', title || '', trimmedStory, image_url || '', pdf_url || '', published ? 'approved' : 'pending', req.params.id]
  );
  res.json({ ok: true });
});

router.patch('/admin/testimonies/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  await db.query('UPDATE testimonies SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/testimonies/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM testimonies WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
