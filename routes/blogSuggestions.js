const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: slanje prijedloga/želje za blog (ne prikazuje se nigdje javno, samo u adminu) ---
router.post('/blog-suggestions', async (req, res) => {
  const { name, message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Prijedlog ne smije biti prazan.' });
  }
  await db.query(
    "INSERT INTO blog_suggestions (name, message, status) VALUES ($1, $2, 'new')",
    [(name || '').trim(), message.trim()]
  );
  res.json({ ok: true, message: 'Hvala na prijedlogu! 🤍' });
});

// --- Admin ---
router.get('/admin/blog-suggestions', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM blog_suggestions ORDER BY created_at DESC');
  res.json(rows);
});

router.patch('/admin/blog-suggestions/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['new', 'read'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  await db.query('UPDATE blog_suggestions SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/blog-suggestions/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM blog_suggestions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
