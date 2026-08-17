const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');

const router = express.Router();

// Ista logika anonimnog kolačića kao za brojanje posjeta (vid) — koristi se ovdje da
// jedna osoba može ocijeniti isti blog samo jednom (kasniji klik samo mijenja njenu ocjenu,
// ne dodaje novu). Bez imena, bez IP adrese, bez ikakvih osobnih podataka.
const VISITOR_COOKIE = 'vid';
const VISITOR_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 dana

function getOrSetVisitorId(req, res) {
  let visitorId = req.cookies && req.cookies[VISITOR_COOKIE];
  if (!visitorId) {
    visitorId = crypto.randomBytes(16).toString('hex');
    res.cookie(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: VISITOR_COOKIE_MAX_AGE,
    });
  }
  return visitorId;
}

async function getSummary(postId) {
  const { rows } = await db.query(
    'SELECT COALESCE(AVG(rating), 0)::float AS average, COUNT(*)::int AS count FROM blog_ratings WHERE post_id = $1',
    [postId]
  );
  return { average: Math.round(rows[0].average * 10) / 10, count: rows[0].count };
}

// --- Javno: prosjeci ocjena za SVE objave odjednom (za prikaz na karticama u listi) ---
router.get('/blog-ratings/summary', async (req, res) => {
  const { rows } = await db.query(
    'SELECT post_id, COALESCE(AVG(rating), 0)::float AS average, COUNT(*)::int AS count FROM blog_ratings GROUP BY post_id'
  );
  const summary = {};
  rows.forEach((r) => {
    summary[r.post_id] = { average: Math.round(r.average * 10) / 10, count: r.count };
  });
  res.set('Cache-Control', 'no-store');
  res.json(summary);
});

// --- Javno: dohvat prosjeka ocjena + je li ova osoba (kolačić) već ocijenila ---
router.get('/blog/:id/rating', async (req, res) => {
  const postId = req.params.id;
  const visitorId = req.cookies && req.cookies[VISITOR_COOKIE];
  const summary = await getSummary(postId);
  let myRating = null;
  if (visitorId) {
    const { rows } = await db.query(
      'SELECT rating FROM blog_ratings WHERE post_id = $1 AND visitor_hash = $2',
      [postId, visitorId]
    );
    if (rows[0]) myRating = rows[0].rating;
  }
  res.set('Cache-Control', 'no-store');
  res.json({ average: summary.average, count: summary.count, myRating });
});

// --- Javno: ocijeni (1-5 zvjezdica), anonimno, bez komentara ---
router.post('/blog/:id/rating', async (req, res) => {
  const postId = req.params.id;
  const rating = Number(req.body && req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Ocjena mora biti broj od 1 do 5.' });
  }

  const { rows: postRows } = await db.query('SELECT id FROM blog_posts WHERE id = $1 AND published = 1', [postId]);
  if (!postRows[0]) return res.status(404).json({ error: 'Objava nije pronađena.' });

  const visitorId = getOrSetVisitorId(req, res);
  await db.query(
    `INSERT INTO blog_ratings (post_id, visitor_hash, rating) VALUES ($1, $2, $3)
     ON CONFLICT (post_id, visitor_hash) DO UPDATE SET rating = EXCLUDED.rating`,
    [postId, visitorId, rating]
  );

  const summary = await getSummary(postId);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, average: summary.average, count: summary.count, myRating: rating });
});

module.exports = router;
