const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: prikaz odobrenih nakana na molitvenom zidu ---
router.get('/prayers', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, message, anonymous, pray_count, created_at FROM prayers WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30"
  );
  res.json(rows);
});

// --- Javno: slanje nove nakane (ide na čekanje dok admin ne odobri) ---
router.post('/prayers', async (req, res) => {
  const { name, message, anonymous } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Molitvena nakana ne smije biti prazna.' });
  }
  await db.query(
    "INSERT INTO prayers (name, message, anonymous, status) VALUES ($1, $2, $3, 'pending')",
    [anonymous === false ? (name || '') : '', message.trim(), anonymous === false ? 0 : 1]
  );
  res.json({ ok: true, message: 'Hvala, vaša nakana je poslana i bit će objavljena nakon pregleda.' });
});

// --- Javno: klik "Molim za ovo" — jedan glas po osobi (IP) po nakani ---
router.post('/prayers/:id/pray', async (req, res) => {
  const prayerId = req.params.id;

  const { rows } = await db.query("SELECT id FROM prayers WHERE id = $1 AND status = 'approved'", [prayerId]);
  if (!rows[0]) {
    return res.status(404).json({ error: 'Nakana nije pronađena.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const voterHash = crypto.createHash('sha256').update(ip + ':' + prayerId).digest('hex');

  try {
    await db.query('INSERT INTO prayer_votes (prayer_id, voter_hash) VALUES ($1, $2)', [prayerId, voterHash]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Već ste molili za ovu nakanu.' });
    }
    throw err;
  }

  await db.query('UPDATE prayers SET pray_count = pray_count + 1 WHERE id = $1', [prayerId]);
  res.json({ ok: true });
});

// --- Admin: sve nakane (uključujući one na čekanju) ---
router.get('/admin/prayers', requireAdmin, async (req, res) => {
  const { rows } = await db.query('SELECT * FROM prayers ORDER BY created_at DESC');
  res.json(rows);
});

router.patch('/admin/prayers/:id', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Nepoznat status.' });
  }
  await db.query('UPDATE prayers SET status=$1 WHERE id=$2', [status, req.params.id]);
  res.json({ ok: true });
});

router.delete('/admin/prayers/:id', requireAdmin, async (req, res) => {
  await db.query('DELETE FROM prayers WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

module.exports = router;
