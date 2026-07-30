const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno ---
router.get('/blog', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/blog/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blog_posts WHERE id = $1 AND published = 1', [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Objava nije pronađena.' });
  await db.query('UPDATE blog_posts SET views = views + 1 WHERE id = $1', [req.params.id]);
  res.json(row);
});

// --- Admin ---
router.get('/admin/blog', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blog_posts ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/admin/blog', requireAdmin, async (req, res) => {
  const { title, category, excerpt, content, image_note, image_url, published } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const { rows } = await db.query(
    'INSERT INTO blog_posts (title, category, excerpt, content, image_note, image_url, published) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [title, category || '', excerpt || '', content || '', image_note || '', image_url || '', published ? 1 : 0]
  );
  res.json({ id: rows[0].id });
});

router.put('/admin/blog/:id', requireAdmin, async (req, res) => {
  const { title, category, excerpt, content, image_note, image_url, published } = req.body || {};
  await db.query(
    'UPDATE blog_posts SET title=$1, category=$2, excerpt=$3, content=$4, image_note=$5, image_url=$6, published=$7 WHERE id=$8',
    [title, category || '', excerpt || '', content || '', image_note || '', image_url || '', published ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/admin/blog/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM blog_posts WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
