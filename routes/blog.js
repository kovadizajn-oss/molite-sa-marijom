const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno ---
router.get('/blog', (req, res) => {
  const rows = db.prepare('SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/blog/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM blog_posts WHERE id = ? AND published = 1').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Objava nije pronađena.' });
  res.json(row);
});

// --- Admin ---
router.get('/admin/blog', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM blog_posts ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/admin/blog', requireAdmin, (req, res) => {
  const { title, category, excerpt, content, image_note, published } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const info = db.prepare(
    'INSERT INTO blog_posts (title, category, excerpt, content, image_note, published) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, category || '', excerpt || '', content || '', image_note || '', published ? 1 : 0);
  res.json({ id: Number(info.lastInsertRowid) });
});

router.put('/admin/blog/:id', requireAdmin, (req, res) => {
  const { title, category, excerpt, content, image_note, published } = req.body || {};
  db.prepare(
    'UPDATE blog_posts SET title=?, category=?, excerpt=?, content=?, image_note=?, published=? WHERE id=?'
  ).run(title, category || '', excerpt || '', content || '', image_note || '', published ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/blog/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM blog_posts WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
