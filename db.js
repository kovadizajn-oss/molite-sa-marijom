// db.js — Postgres baza (Supabase) preko pg Pool
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.warn('UPOZORENJE: DATABASE_URL nije postavljen. Baza neće raditi dok ne dodaš tu environment varijablu.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
});

function query(text, params) {
  return pool.query(text, params);
}

async function ensureColumn(table, column, definition) {
  await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT DEFAULT '',
      excerpt TEXT DEFAULT '',
      content TEXT DEFAULT '',
      image_note TEXT DEFAULT '',
      published INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hodocasca (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      location TEXT DEFAULT '',
      date_range TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_note TEXT DEFAULT '',
      published INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prayers (
      id SERIAL PRIMARY KEY,
      name TEXT DEFAULT '',
      message TEXT NOT NULL,
      anonymous INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending',
      pray_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS testimonies (
      id SERIAL PRIMARY KEY,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      story TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      question TEXT NOT NULL,
      answer TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      answered_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS prayer_votes (
      id SERIAL PRIMARY KEY,
      prayer_id INTEGER NOT NULL,
      voter_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(prayer_id, voter_hash)
    );

    CREATE TABLE IF NOT EXISTS daily_thoughts (
      id SERIAL PRIMARY KEY,
      quote TEXT NOT NULL,
      source TEXT DEFAULT '',
      published INTEGER DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id SERIAL PRIMARY KEY,
      path TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Migracije za baze koje su možda nastale prije nego su ove kolone dodane
  await ensureColumn('blog_posts', 'image_url', "TEXT DEFAULT ''");
  await ensureColumn('hodocasca', 'image_url', "TEXT DEFAULT ''");
  await ensureColumn('testimonies', 'image_url', "TEXT DEFAULT ''");
  await ensureColumn('testimonies', 'title', "TEXT DEFAULT ''");
  await ensureColumn('testimonies', 'source', "TEXT DEFAULT 'user'");
  await ensureColumn('daily_thoughts', 'image_url', "TEXT DEFAULT ''");
  await ensureColumn('blog_posts', 'views', 'INTEGER DEFAULT 0');

  // Seed početnog admin računa ako još ne postoji nijedan
  const { rows } = await pool.query('SELECT COUNT(*)::int as c FROM admin_users');
  if (rows[0].c === 0) {
    const username = process.env.ADMIN_INITIAL_USERNAME || 'marija';
    const password = process.env.ADMIN_INITIAL_PASSWORD || 'molitva123';
    const hash = bcrypt.hashSync(password, 10);
    await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', [username, hash]);
    console.log(`Kreiran početni admin račun -> korisničko ime: ${username} / lozinka: ${password} (promijeni je odmah nakon prvog logina!)`);
  }
}

// Na serverless okruženju (Vercel) svaki "hladni start" mora prvo pričekati da baza bude spremna.
// Promise se cachea pa se initDb() stvarno izvrši samo jednom po pokrenutoj instanci funkcije.
let readyPromise = null;
function ready() {
  if (!readyPromise) readyPromise = initDb();
  return readyPromise;
}

module.exports = { pool, query, ready };
