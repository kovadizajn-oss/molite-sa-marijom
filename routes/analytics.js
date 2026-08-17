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

// --- Admin: čitanost svake blog objave (ukupno pregleda + jedinstveni čitatelji) ---
// Jedinstveni čitatelji broje se preko istog anonimnog kolačića kao i ostala analitika,
// tako da isti čovjek koji je isti post otvorio 5 puta broji se kao 1 čitatelj, ali 5 pregleda.
router.get('/admin/analytics/blog', requireAdmin, async (req, res) => {
  const [posts, views] = await Promise.all([
    db.query('SELECT id, title, published, views, created_at FROM blog_posts ORDER BY created_at DESC'),
    db.query("SELECT path, visitor_hash FROM page_views WHERE path LIKE '/post.html?id=%'"),
  ]);

  const stats = {};
  views.rows.forEach((v) => {
    const match = String(v.path).match(/^\/post\.html\?id=(\d+)$/);
    if (!match) return;
    const id = match[1];
    if (!stats[id]) stats[id] = { total: 0, visitors: new Set() };
    stats[id].total += 1;
    stats[id].visitors.add(v.visitor_hash);
  });

  const result = posts.rows
    .map((p) => {
      const s = stats[p.id];
      return {
        id: p.id,
        title: p.title,
        published: p.published,
        created_at: p.created_at,
        views: s ? s.total : 0,
        unique_readers: s ? s.visitors.size : 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  res.json(result);
});

module.exports = router;
