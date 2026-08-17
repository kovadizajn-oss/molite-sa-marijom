const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '../public');

// Ubacuje stvarni naslov/opis/sliku konkretne objave/svjedočanstva u og:/twitter: meta tagove
// prije nego stranica ode do preglednika — tako WhatsApp/Facebook/itd. prikazuju PRAVI
// naslov i sliku te objave kad se link podijeli, a ne opće tagove sa stranice.
function injectOgTags(html, { title, description, image, url }) {
  const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const t = esc(title);
  const d = esc(description);
  const i = esc(image);
  const u = esc(url);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${i}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${u}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${i}$2`);
}

router.get('/post.html', async (req, res, next) => {
  const id = req.query.id;
  if (!id) return next();
  try {
    const { rows } = await db.query(
      "SELECT title, excerpt, content, image_url FROM blog_posts WHERE id = $1 AND published = 1",
      [id]
    );
    const post = rows[0];
    if (!post) return next();
    const origin = req.protocol + '://' + req.get('host');
    const template = fs.readFileSync(path.join(PUBLIC_DIR, 'post.html'), 'utf8');
    const html = injectOgTags(template, {
      title: post.title + ' — Molite s Marijom',
      description: (post.excerpt || post.content || 'Pročitajte objavu na blogu Molite s Marijom.').slice(0, 160),
      image: post.image_url || origin + '/images/hero-molitva.jpg',
      url: origin + '/post.html?id=' + id,
    });
    res.type('html').send(html);
  } catch {
    next();
  }
});

router.get('/testimony.html', async (req, res, next) => {
  const id = req.query.id;
  if (!id) return next();
  try {
    const { rows } = await db.query(
      "SELECT title, name, story, image_url FROM testimonies WHERE id = $1 AND status = 'approved'",
      [id]
    );
    const t = rows[0];
    if (!t) return next();
    const origin = req.protocol + '://' + req.get('host');
    const heading = t.title || t.name || 'Svjedočanstvo';
    const template = fs.readFileSync(path.join(PUBLIC_DIR, 'testimony.html'), 'utf8');
    const html = injectOgTags(template, {
      title: heading + ' — Molite s Marijom',
      description: (t.story || 'Pročitajte svjedočanstvo na Molite s Marijom.').slice(0, 160),
      image: t.image_url || origin + '/images/hero-molitva.jpg',
      url: origin + '/testimony.html?id=' + id,
    });
    res.type('html').send(html);
  } catch {
    next();
  }
});

module.exports = router;
