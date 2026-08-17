const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: objavljene knjige, prikazuju se na /svjedocanstva.html ---
router.get('/books', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM books WHERE published = 1 ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/books/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM books WHERE id = $1 AND published = 1', [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Knjiga nije pronađena.' });
  res.json(row);
});

// --- Admin: sve knjige (uključujući neobjavljene) ---
router.get('/admin/books', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM books ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/admin/books', requireAdmin, async (req, res) => {
  const { title, author, description, cover_image_url, pdf_url, published } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Naslov je obavezan.' });
  if (!pdf_url) return res.status(400).json({ error: 'PDF datoteka je obavezna.' });
  const { rows } = await db.query(
    'INSERT INTO books (title, author, description, cover_image_url, pdf_url, published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [title.trim(), author || '', description || '', cover_image_url || '', pdf_url, published ? 1 : 0]
  );
  res.json({ id: rows[0].id });
});

router.put('/admin/books/:id', requireAdmin, async (req, res) => {
  const { title, author, description, cover_image_url, pdf_url, published } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Naslov je obavezan.' });
  if (!pdf_url) return res.status(400).json({ error: 'PDF datoteka je obavezna.' });
  await db.query(
    'UPDATE books SET title=$1, author=$2, description=$3, cover_image_url=$4, pdf_url=$5, published=$6 WHERE id=$7',
    [title.trim(), author || '', description || '', cover_image_url || '', pdf_url, published ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/admin/books/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM books WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
