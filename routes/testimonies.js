const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

router.get('/testimonies', (req, res) => {
  const rows = db.prepare(
    "SELECT id, name, story, created_at FROM testimonies WHERE status = 'approved' ORDER BY created_at DESC"
  ).all();
  res.json(rows);
});

router.post('/testimonies', (req, res) => {
  const { name, email, story } = req.body || {};
  if (!story || !story.trim()) {
    return res.status(400).json({ error: 'Svjedočanstvo ne smije biti prazno.' });
  }
  db.prepare(
    "INSERT INTO testimonies (name, email, story, status) VALUES (?, ?, ?, 'pending')"
  ).run(name || '', email || '', story.trim());
  res.json({ ok: true, message: 'Hvala što ste podijelili svoje svjedočanstvo! Bit će objavljeno nakon pregleda.' });
});

router.get('/admin/testimonies', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM testimonies ORDER BY created_at DESC').all();
  res.json(rows);
});

router.patch('/admin/testimonies/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  db.prepare('UPDATE testimonies SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/testimonies/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM testimonies WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
