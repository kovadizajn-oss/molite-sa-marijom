const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/hodocasca', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM hodocasca WHERE published = 1 ORDER BY created_at DESC');
  res.json(rows);
});

router.get('/hodocasca/:id', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM hodocasca WHERE id = $1 AND published = 1', [req.params.id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: 'Hodočašće nije pronađeno.' });
  res.json(row);
});

router.get('/admin/hodocasca', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM hodocasca ORDER BY created_at DESC');
  res.json(rows);
});

router.post('/admin/hodocasca', requireAdmin, async (req, res) => {
  const { title, location, date_range, description, image_note, image_url, published } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const { rows } = await db.query(
    'INSERT INTO hodocasca (title, location, date_range, description, image_note, image_url, published) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [title, location || '', date_range || '', description || '', image_note || '', image_url || '', published ? 1 : 0]
  );
  res.json({ id: rows[0].id });
});

router.put('/admin/hodocasca/:id', requireAdmin, async (req, res) => {
  const { title, location, date_range, description, image_note, image_url, published } = req.body || {};
  await db.query(
    'UPDATE hodocasca SET title=$1, location=$2, date_range=$3, description=$4, image_note=$5, image_url=$6, published=$7 WHERE id=$8',
    [title, location || '', date_range || '', description || '', image_note || '', image_url || '', published ? 1 : 0, req.params.id]
  );
  res.json({ ok: true });
});

router.delete('/admin/hodocasca/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM hodocasca WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
