const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: prikaz odobrenih nakana na molitvenom zidu ---
router.get('/prayers', (req, res) => {
  const rows = db.prepare(
    "SELECT id, name, message, anonymous, pray_count, created_at FROM prayers WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30"
  ).all();
  res.json(rows);
});

// --- Javno: slanje nove nakane (ide na čekanje dok admin ne odobri) ---
router.post('/prayers', (req, res) => {
  const { name, message, anonymous } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Molitvena nakana ne smije biti prazna.' });
  }
  db.prepare(
    "INSERT INTO prayers (name, message, anonymous, status) VALUES (?, ?, ?, 'pending')"
  ).run(anonymous === false ? (name || '') : '', message.trim(), anonymous === false ? 0 : 1);
  res.json({ ok: true, message: 'Hvala, vaša nakana je poslana i bit će objavljena nakon pregleda.' });
});

// --- Javno: klik "Molim za ovo" — jedan glas po osobi (IP) po nakani ---
router.post('/prayers/:id/pray', (req, res) => {
  const prayerId = req.params.id;

  const prayer = db.prepare("SELECT id FROM prayers WHERE id = ? AND status = 'approved'").get(prayerId);
  if (!prayer) {
    return res.status(404).json({ error: 'Nakana nije pronađena.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const voterHash = crypto.createHash('sha256').update(ip + ':' + prayerId).digest('hex');

  try {
    db.prepare('INSERT INTO prayer_votes (prayer_id, voter_hash) VALUES (?, ?)').run(prayerId, voterHash);
  } catch (err) {
    return res.status(409).json({ error: 'Već ste molili za ovu nakanu.' });
  }

  db.prepare('UPDATE prayers SET pray_count = pray_count + 1 WHERE id = ?').run(prayerId);
  res.json({ ok: true });
});

// --- Admin: sve nakane (uključujući one na čekanju) ---
router.get('/admin/prayers', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM prayers ORDER BY created_at DESC').all();
  res.json(rows);
});

router.patch('/admin/prayers/:id', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  db.prepare('UPDATE prayers SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

router.delete('/admin/prayers/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM prayers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
