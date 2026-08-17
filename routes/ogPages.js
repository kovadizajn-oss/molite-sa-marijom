const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');

const router = express.Router();
const PUBLIC_DIR = path.join(__dirname, '../public');

// VAŽNO: post.html i testimony.html NE postoje kao statični fajlovi u public/ (preimenovani
// su u post-template.html / testimony-template.html). Vercel uvijek prvo poslužuje statični
// fajl ako postoji na istoj putanji kao ova ruta (dokumentirano ponašanje, nema zaobilaska) —
// pa da bi ova ruta ikad bila pozvana, fizički fajl na /post.html i /testimony.html ne smije
// postojati. Zato ova ruta MORA uvijek sama poslužiti stranicu (nema više next()-a na statiku).

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

router.get('/post.html', async (req, res) => {
  const id = req.query.id;
  const template = fs.readFileSync(path.join(PUBLIC_DIR, 'post-template.html'), 'utf8');
  const origin = req.protocol + '://' + req.get('host');

  if (!id) {
    res.set('Cache-Control', 'no-store');
    return res.type('html').send(template);
  }

  try {
    const { rows } = await db.query(
      "SELECT title, excerpt, content, image_url FROM blog_posts WHERE id = $1 AND published = 1",
      [id]
    );
    const post = rows[0];
    if (!post) {
      res.set('Cache-Control', 'no-store');
      return res.type('html').send(template);
    }
    const html = injectOgTags(template, {
      title: post.title + ' — Molite s Marijom',
      description: (post.excerpt || post.content || 'Pročitajte objavu na blogu Molite s Marijom.').slice(0, 160),
      image: post.image_url || origin + '/images/hero-molitva.jpg',
      url: origin + '/post.html?id=' + id,
    });
    res.set('Cache-Control', 'no-store');
    res.type('html').send(html);
  } catch (e) {
    console.error('[og] /post.html id=' + id + ' -> GREŠKA:', e.message);
    res.set('Cache-Control', 'no-store');
    res.type('html').send(template);
  }
});

router.get('/testimony.html', async (req, res) => {
  const id = req.query.id;
  const template = fs.readFileSync(path.join(PUBLIC_DIR, 'testimony-template.html'), 'utf8');
  const origin = req.protocol + '://' + req.get('host');

  if (!id) {
    res.set('Cache-Control', 'no-store');
    return res.type('html').send(template);
  }

  try {
    const { rows } = await db.query(
      "SELECT title, name, story, image_url FROM testimonies WHERE id = $1 AND status = 'approved'",
      [id]
    );
    const t = rows[0];
    if (!t) {
      res.set('Cache-Control', 'no-store');
      return res.type('html').send(template);
    }
    const heading = t.title || t.name || 'Svjedočanstvo';
    const html = injectOgTags(template, {
      title: heading + ' — Molite s Marijom',
      description: (t.story || 'Pročitajte svjedočanstvo na Molite s Marijom.').slice(0, 160),
      image: t.image_url || origin + '/images/hero-molitva.jpg',
      url: origin + '/testimony.html?id=' + id,
    });
    res.set('Cache-Control', 'no-store');
    res.type('html').send(html);
  } catch (e) {
    console.error('[og] /testimony.html id=' + id + ' -> GREŠKA:', e.message);
    res.set('Cache-Control', 'no-store');
    res.type('html').send(template);
  }
});

module.exports = router;
