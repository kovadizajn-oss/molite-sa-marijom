const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

// --- Javno: prikaz odobrenih nakana na molitvenom zidu ---
router.get('/prayers', async (req, res) => {
  const { rows } = await db.query(
    "SELECT id, name, message, anonymous, pray_count, created_at FROM prayers WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30"
  );
  res.set('Cache-Control', 'no-store');
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

// --- Javno: klik "Molim za ovo" — jednostavno +1, bez praćenja tko je već glasao ---
// (unutar iste sesije preglednika gumb se sam onemogući preko localStorage na frontendu;
// ne provjeravamo IP/kolačić na serveru jer to nepotrebno kompliciralo i pravilo probleme)
router.post('/prayers/:id/pray', async (req, res) => {
  const prayerId = req.params.id;

  const updated = await db.query(
    "UPDATE prayers SET pray_count = pray_count + 1 WHERE id = $1 AND status = 'approved' RETURNING pray_count",
    [prayerId]
  );
  if (!updated.rows[0]) {
    return res.status(404).json({ error: 'Nakana nije pronađena.' });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, pray_count: updated.rows[0].pray_count });
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
