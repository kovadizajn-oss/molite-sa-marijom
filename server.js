const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./db');

const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
const hodocascaRoutes = require('./routes/hodocasca');
const prayersRoutes = require('./routes/prayers');
const testimoniesRoutes = require('./routes/testimonies');
const questionsRoutes = require('./routes/questions');
const uploadRoutes = require('./routes/upload');
const dailyThoughtRoutes = require('./routes/dailyThought');
const analyticsRoutes = require('./routes/analytics');
const customPrayersRoutes = require('./routes/customPrayers');
const booksRoutes = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Na serverless (Vercel) svaka "hladna" instanca prvo mora pričekati da se baza pripremi
// (kreiranje tablica ako ne postoje + početni admin račun). Promise se cachea pa se to
// stvarno izvrši samo jednom po instanci, ne na svaki zahtjev.
app.use(async (req, res, next) => {
  try {
    await db.ready();
    next();
  } catch (e) {
    console.error('Greška pri pripremi baze:', e);
    res.status(500).json({ error: 'Baza trenutno nije dostupna. Pokušajte ponovno za trenutak.' });
  }
});

// API rute
app.use('/api/auth', authRoutes);
app.use('/api', blogRoutes);
app.use('/api', hodocascaRoutes);
app.use('/api', prayersRoutes);
app.use('/api', testimoniesRoutes);
app.use('/api', questionsRoutes);
app.use('/api', uploadRoutes);
app.use('/api', dailyThoughtRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', customPrayersRoutes);
app.use('/api', booksRoutes);

// --- Jednostavno brojanje posjeta javnih stranica ---
// Jedinstveni posjetitelj prati se anonimnim kolačićem (nasumičan id, bez IP adrese,
// bez osobnih podataka, ne dijeli se ni s kim) — puno pouzdanije od stare IP-only metode,
// koja je preko mobilnog interneta lako brojala istu osobu kao više "jedinstvenih" posjetitelja.
const VISITOR_COOKIE = 'vid';
const VISITOR_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 dana

// Botovi (WhatsApp/Facebook/Messenger/Viber pregled linka, tražilice, razni skeneri) ne
// pamte kolačiće — svaki njihov posjet bi inače brojali kao novog "jedinstvenog posjetitelja",
// pa ih ovdje potpuno izbacujemo iz brojanja.
const BOT_UA_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|linkedinbot|pinterest|embedly|quora link preview|outbrain|vkshare|w3c_validator|redditbot|applebot|bingpreview|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|curl|wget|python-requests|headlesschrome|phantomjs|uptimerobot|pingdom|statuscake/i;

app.use(async (req, res, next) => {
  const isPageRequest = req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'));
  const isAdminOrApi = req.path.startsWith('/admin') || req.path.startsWith('/api');
  const isBot = BOT_UA_PATTERN.test(req.headers['user-agent'] || '');
  if (isPageRequest && !isAdminOrApi && !isBot) {
    try {
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
      // Spremamo cijeli URL (s query stringom) da razlikujemo npr. post.html?id=1 od post.html?id=2
      await db.query('INSERT INTO page_views (path, visitor_hash) VALUES ($1, $2)', [req.originalUrl, visitorId]);
    } catch {
      // brojanje posjeta ne smije nikad srušiti stranicu
    }
  }
  next();
});

// Statični fajlovi — javna stranica i admin panel
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Lokalno (npm start) pokrećemo pravi server; na Vercelu se app samo exporta
// i poziva iz api/index.js kao serverless funkcija.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Molite s Marijom sluša na portu ${PORT}`);
    console.log(`Javna stranica: http://localhost:${PORT}/`);
    console.log(`Admin panel:    http://localhost:${PORT}/admin/`);
  });
}

module.exports = app;
