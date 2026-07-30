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

// --- Jednostavno brojanje posjeta javnih stranica (bez cookieja, hashirana IP adresa) ---
app.use(async (req, res, next) => {
  const isPageRequest = req.method === 'GET' && (req.path === '/' || req.path.endsWith('.html'));
  const isAdminOrApi = req.path.startsWith('/admin') || req.path.startsWith('/api');
  if (isPageRequest && !isAdminOrApi) {
    try {
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
      const visitorHash = crypto.createHash('sha256').update(ip).digest('hex');
      // Spremamo cijeli URL (s query stringom) da razlikujemo npr. post.html?id=1 od post.html?id=2
      await db.query('INSERT INTO page_views (path, visitor_hash) VALUES ($1, $2)', [req.originalUrl, visitorHash]);
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
    console.log(`Molite sa Marijom sluša na portu ${PORT}`);
    console.log(`Javna stranica: http://localhost:${PORT}/`);
    console.log(`Admin panel:    http://localhost:${PORT}/admin/`);
  });
}

module.exports = app;
