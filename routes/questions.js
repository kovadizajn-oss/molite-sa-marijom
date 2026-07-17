const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: objavljena pitanja s odgovorima ---
router.get('/questions', (req, res) => {
  const rows = db.prepare(
    "SELECT id, name, question, answer, answered_at FROM questions WHERE status = 'published' ORDER BY answered_at DESC"
  ).all();
  res.json(rows);
});

// --- Javno: postavljanje novog pitanja ---
router.post('/questions', (req, res) => {
  const { name, email, question } = req.body || {};
  if (!question || !question.trim()) {
    return res.status(400).json({ error: 'Pitanje ne smije biti prazno.' });
  }
  db.prepare(
    "INSERT INTO questions (name, email, question, status) VALUES (?, ?, ?, 'pending')"
  ).run(name || '', email || '', question.trim());
  res.json({ ok: true, message: 'Hvala na pitanju! Marija će odgovoriti uskoro.' });
});

router.get('/admin/questions', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM questions ORDER BY created_at DESC').all();
  res.json(rows);
});

// Admin odgovara i/ili mijenja status (pending / published / rejected)
router.patch('/admin/questions/:id', requireAdmin, (req, res) => {
  const { answer, status } = req.body || {};
  const current = db.prepare('SELECT * FROM questions WHERE id=?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Pitanje nije pronađeno.' });

  const newAnswer = answer !== undefined ? answer : current.answer;
  const newStatus = status !== undefined ? status : current.status;
  const answeredAt = newStatus === 'published' ? new Date().toISOString() : current.answered_at;

  db.prepare('UPDATE questions SET answer=?, status=?, answered_at=? WHERE id=?')
    .run(newAnswer, newStatus, answeredAt, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/questions/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM questions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
