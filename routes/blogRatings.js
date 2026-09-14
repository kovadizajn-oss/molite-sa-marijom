const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');

const router = express.Router();

// Kolačić se i dalje koristi za analitiku posjeta, ali NE za ograničavanje ocjenjivanja —
// svaki klik na zvjezdice broji se kao nova ocjena, čak i od iste osobe. Unutar jednog
// otvaranja stranice gumbi se zaključaju nakon klika (da se izbjegne slučajno višestruko
// slanje), ali čim se stranica ponovno učita (izađe pa se vrati), može se opet ocijeniti —
// i tako svaki put iznova, bez ograničenja.
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

// --- Javno: dohvat prosjeka ocjena (bez "već ocijenjeno" provjere — svako učitavanje kreće ispočetka) ---
router.get('/blog/:id/rating', async (req, res) => {
  const postId = req.params.id;
  const summary = await getSummary(postId);
  res.set('Cache-Control', 'no-store');
  res.json({ average: summary.average, count: summary.count });
});

// --- Javno: ocijeni (1-5 zvjezdica), anonimno, bez komentara — svaki klik je nova ocjena,
// bez ograničenja koliko puta ista osoba može ocijeniti tijekom vremena ---
router.post('/blog/:id/rating', async (req, res) => {
  const postId = req.params.id;
  const rating = Number(req.body && req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Ocjena mora biti broj od 1 do 5.' });
  }

  const { rows: postRows } = await db.query('SELECT id FROM blog_posts WHERE id = $1 AND published = 1', [postId]);
  if (!postRows[0]) return res.status(404).json({ error: 'Objava nije pronađena.' });

  const visitorId = getOrSetVisitorId(req, res);
  await db.query('INSERT INTO blog_ratings (post_id, visitor_hash, rating) VALUES ($1, $2, $3)', [postId, visitorId, rating]);

  const summary = await getSummary(postId);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, average: summary.average, count: summary.count, myRating: rating });
});

module.exports = router;
