const express = require('express');
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

function countSince(interval) {
  if (!interval) {
    return db.query(
      'SELECT COUNT(*)::int as total, COUNT(DISTINCT visitor_hash)::int as unique_visitors FROM page_views'
    );
  }
  return db.query(
    `SELECT COUNT(*)::int as total, COUNT(DISTINCT visitor_hash)::int as unique_visitors FROM page_views WHERE created_at >= NOW() - $1::interval`,
    [interval]
  );
}

// --- Admin: sažetak posjeta (ukupno, zadnjih 7 i 30 dana) ---
router.get('/admin/analytics/summary', requireAdmin, async (req, res) => {
  const [allTime, last7Days, last30Days] = await Promise.all([
    countSince(null),
    countSince('7 days'),
    countSince('30 days'),
  ]);
  res.json({
    allTime: allTime.rows[0],
    last7Days: last7Days.rows[0],
    last30Days: last30Days.rows[0],
  });
});

// --- Ljudski čitljivi nazivi za statične stranice ---
const FRIENDLY_NAMES = {
  '/': 'Početna',
  '/blog.html': 'Blog (popis objava)',
  '/svjedocanstva.html': 'Svjedočanstva (popis)',
  '/hodocasca.html': 'Hodočašća',
  '/sos-molitveni-zid.html': 'SOS Molitveni zid',
  '/kako-moliti.html': 'Kako moliti',
  '/marija-odgovara.html': 'Marija odgovara',
  '/audio-video-meditacije.html': 'Audio/video meditacije',
  '/kutak-za-mlade.html': 'Kutak za mlade',
  '/o-meni.html': 'O meni',
};

// --- Admin: najposjećenije stranice u zadnjih 30 dana ---
router.get('/admin/analytics/pages', requireAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT path, COUNT(*)::int as views FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY path ORDER BY views DESC LIMIT 20`
  );

  const result = await Promise.all(
    rows.map(async (r) => {
      const [rawPath, query] = r.path.split('?');
      const id = query ? new URLSearchParams(query).get('id') : null;

      if (rawPath === '/post.html') {
        const post = id ? (await db.query('SELECT title FROM blog_posts WHERE id = $1', [id])).rows[0] : null;
        return { tag: 'BLOG', label: post ? post.title : id ? `Objava #${id} (obrisana)` : 'Blog objava', views: r.views };
      }
      if (rawPath === '/testimony.html') {
        const t = id ? (await db.query('SELECT name, title FROM testimonies WHERE id = $1', [id])).rows[0] : null;
        return {
          tag: 'SVJEDOČANSTVO',
          label: t ? (t.title || t.name) : id ? `Svjedočanstvo #${id} (obrisano)` : 'Svjedočanstvo',
          views: r.views,
        };
      }
      return { tag: '', label: FRIENDLY_NAMES[rawPath] || rawPath, views: r.views };
    })
  );

  res.json(result);
});

module.exports = router;
