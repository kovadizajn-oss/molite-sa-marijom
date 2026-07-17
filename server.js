const express = require('express');
const session = require('express-session');
const path = require('node:path');
require('./db'); // inicijalizira bazu (i kreira admin korisnika ako ne postoji)

const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
const hodocascaRoutes = require('./routes/hodocasca');
const prayersRoutes = require('./routes/prayers');
const testimoniesRoutes = require('./routes/testimonies');
const questionsRoutes = require('./routes/questions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'promijeni-ovu-tajnu-u-produkciji',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8h
      // secure: true, // uključi kad stranica radi preko HTTPS-a (Render to radi automatski)
    },
  })
);

// API rute
app.use('/api/auth', authRoutes);
app.use('/api', blogRoutes);
app.use('/api', hodocascaRoutes);
app.use('/api', prayersRoutes);
app.use('/api', testimoniesRoutes);
app.use('/api', questionsRoutes);

// Statični fajlovi — javna stranica i admin panel
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.listen(PORT, () => {
  console.log(`Molite sa Marijom sluša na portu ${PORT}`);
  console.log(`Javna stranica: http://localhost:${PORT}/`);
  console.log(`Admin panel:    http://localhost:${PORT}/admin/`);
});
