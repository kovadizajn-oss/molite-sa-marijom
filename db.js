// db.js — SQLite baza (koristi ugrađeni node:sqlite, dostupan od Node 22.5+)
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT DEFAULT '',
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    image_note TEXT DEFAULT '',
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hodocasca (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    location TEXT DEFAULT '',
    date_range TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image_note TEXT DEFAULT '',
    published INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS prayers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    message TEXT NOT NULL,
    anonymous INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    pray_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS testimonies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    story TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '',
    email TEXT DEFAULT '',
    question TEXT NOT NULL,
    answer TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    answered_at TEXT
  );

  CREATE TABLE IF NOT EXISTS prayer_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prayer_id INTEGER NOT NULL,
    voter_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(prayer_id, voter_hash)
  );
`);

// Seed default admin user if none exists (username: marija / password: molitva123 — MORA se promijeniti nakon prvog logina)
const existing = db.prepare('SELECT COUNT(*) as c FROM admin_users').get();
if (existing.c === 0) {
  const hash = bcrypt.hashSync('molitva123', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('marija', hash);
  console.log('Kreiran početni admin račun -> korisničko ime: marija / lozinka: molitva123 (promijeni je odmah nakon prvog logina!)');
}

module.exports = db;
