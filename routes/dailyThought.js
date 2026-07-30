const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: najnovija objavljena misao dana ---
router.get('/daily-thought', async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM daily_thoughts WHERE published = 1 ORDER BY created_at DESC LIMIT 1'
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Nema objavljene misli dana.' });
  res.json(row);
});

// --- Admin: sve misli dana ---
router.get('/admin/daily-thoughts', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM daily_thoughts ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/admin/daily-thoughts', requireAdmin, async (req, res) => {
  const { quote, source, image_url, published } = req.body || {};
  if (!quote || !quote.trim()) return res.status(400).json({ error: 'Misao ne smije biti prazna.' });
  const { rows } = await db.query(
    'INSERT INTO daily_thoughts (quote, source, image_url, published) VALUES ($1, $2, $3, $4) RETURNING id',
    [quote.trim(), source || '', image_url || '', published ? 1 : 0]
  );
  res.json({ id: rows[0].id });
});

router.put('/admin/daily-thoughts/:id', requireAdmin, async (req, res) => {
  const { quote, source, image_url, published } = req.body || {};
  if (!quote || !quote.trim()) return res.status(400).json({ error: 'Misao ne smije biti prazna.' });
  await db.query(
    'UPDATE daily_thoughts SET quote=$1, source=$2, image_url=$3, published=$4 WHERE id=$5',
    [quote.trim(), source || '', image_url || '', published ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/admin/daily-thoughts/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM daily_thoughts WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
