const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/hodocasca', (req, res) => {
  const rows = db.prepare('SELECT * FROM hodocasca WHERE published = 1 ORDER BY created_at DESC').all();
  res.json(rows);
});

router.get('/admin/hodocasca', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM hodocasca ORDER BY created_at DESC').all();
  res.json(rows);
});

router.post('/admin/hodocasca', requireAdmin, (req, res) => {
  const { title, location, date_range, description, image_note, published } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const info = db.prepare(
    'INSERT INTO hodocasca (title, location, date_range, description, image_note, published) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(title, location || '', date_range || '', description || '', image_note || '', published ? 1 : 0);
  res.json({ id: Number(info.lastInsertRowid) });
});

router.put('/admin/hodocasca/:id', requireAdmin, (req, res) => {
  const { title, location, date_range, description, image_note, published } = req.body || {};
  db.prepare(
    'UPDATE hodocasca SET title=?, location=?, date_range=?, description=?, image_note=?, published=? WHERE id=?'
  ).run(title, location || '', date_range || '', description || '', image_note || '', published ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/hodocasca/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM hodocasca WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
