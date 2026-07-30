const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: objavljena pitanja s odgovorima ---
router.get('/questions', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, question, answer, answered_at FROM questions WHERE status = 'published' ORDER BY answered_at DESC"
  );
  res.json(rows);
});

// --- Javno: postavljanje novog pitanja ---
router.post('/questions', async (req, res) => {
  const { name, email, question } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Pitanje ne smije biti prazno.' });
  }
  await db.query(
    "INSERT INTO questions (name, email, question, status) VALUES ($1, $2, $3, 'pending')",
    [name || '', email || '', question.trim()]
  );
  res.json({ ok: true, message: 'Hvala na pitanju! Marija će odgovoriti uskoro.' });
});

router.get('/admin/questions', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM questions ORDER BY created_at DESC');
  res.json(rows);
});

// Admin odgovara i/ili mijenja status (pending / published / rejected)
router.patch('/admin/questions/:id', requireAdmin, async (req, res) => {
  const { answer, status } = req.body || {};
  const { rows } = await db.query('SELECT * FROM questions WHERE id=$1', [req.params.id]);
  const current = rows[0];
  if (!current) return res.status(404).json({ error: 'Pitanje nije pronađeno.' });

  const newAnswer = answer !== undefined ? answer : current.answer;
  const newStatus = status !== undefined ? status : current.status;
  const answeredAt = newStatus === 'published' ? new Date().toISOString() : current.answered_at;

  await db.query('UPDATE questions SET answer=$1, status=$2, answered_at=$3 WHERE id=$4', [
    newAnswer,
    newStatus,
    answeredAt,
    req.params.id,
  ]);
  res.json({ ok: true });
});

router.delete('/admin/questions/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM questions WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
