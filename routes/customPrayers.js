const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// Mora se poklapati s id-ovima kategorija na /molitve.html
const VALID_CATEGORIES = ['osnovne-molitve', 'krunica', 'prigodne-molitve', 'litanije', 'razne-molitve'];

// --- Javno: sve molitve dodane kroz admin, prikazuju se na /molitve.html ---
router.get('/molitve', async (req, res) => {
  const { rows } = await db.query('SELECT id, category, title, text, created_at FROM custom_prayers ORDER BY created_at ASC');
  res.json(rows);
});

// --- Admin: dodavanje nove molitve ---
router.post('/admin/molitve', requireAdmin, async (req, res) => {
  const { category, title, text } = req.body || {};
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Nepoznata kategorija.' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Naslov molitve je obavezan.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Tekst molitve je obavezan.' });
  }
  const { rows } = await db.query(
    'INSERT INTO custom_prayers (category, title, text) VALUES ($1, $2, $3) RETURNING *',
    [category, title.trim(), text.trim()]
  );
  res.json(rows[0]);
});

// --- Admin: uređivanje postojeće molitve ---
router.put('/admin/molitve/:id', requireAdmin, async (req, res) => {
  const { category, title, text } = req.body || {};
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Nepoznata kategorija.' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Naslov molitve je obavezan.' });
  }
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Tekst molitve je obavezan.' });
  }
  await db.query(
    'UPDATE custom_prayers SET category=$1, title=$2, text=$3 WHERE id=$4',
    [category, title.trim(), text.trim(), req.params.id]
  );
  res.json({ ok: true });
});

// --- Admin: brisanje molitve ---
router.delete('/admin/molitve/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM custom_prayers WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
