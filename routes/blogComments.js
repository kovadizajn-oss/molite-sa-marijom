const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: dohvat odobrenih komentara za jednu objavu ---
router.get('/blog/:id/comments', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, comment, created_at FROM blog_comments WHERE post_id = $1 AND status = 'approved' ORDER BY created_at DESC",
    [req.params.id]
  );
  res.set('Cache-Control', 'no-store');
  res.json(rows);
});

// --- Javno: slanje novog komentara (ide na čekanje odobrenja, ne prikazuje se odmah) ---
router.post('/blog/:id/comments', async (req, res) => {
  const postId = req.params.id;
  const { name, comment } = req.body || {};
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Komentar ne smije biti prazan.' });
  }
  const { rows: postRows } = await db.query('SELECT id FROM blog_posts WHERE id = $1 AND published = 1', [postId]);
  if (!postRows[0]) return res.status(404).json({ error: 'Objava nije pronađena.' });

  await db.query(
    "INSERT INTO blog_comments (post_id, name, comment, status) VALUES ($1, $2, $3, 'pending')",
    [postId, (name || '').trim(), comment.trim()]
  );
  res.json({ ok: true, message: 'Hvala na komentaru! Bit će vidljiv nakon odobrenja.' });
});

// --- Admin ---
router.get('/admin/blog-comments', requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*, p.title AS post_title
     FROM blog_comments c
     LEFT JOIN blog_posts p ON p.id = c.post_id
     ORDER BY c.created_at DESC`
  );
  res.json(rows);
});

router.patch('/admin/blog-comments/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  await db.query('UPDATE blog_comments SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/blog-comments/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM blog_comments WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
