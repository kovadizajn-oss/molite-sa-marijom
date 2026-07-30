const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'promijeni-ovu-tajnu-u-produkciji';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 1000 * 60 * 60 * 8, // 8h
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Unesite korisničko ime i lozinku.' });
  }
  const { rows } = await db.query('SELECT * FROM admin_users WHERE username = $1', [username]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka.' });
  }
  const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '8h' });
  res.cookie('admin_token', token, COOKIE_OPTS);
  res.json({ ok: true, username: user.username });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', COOKIE_OPTS);
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) return res.json({ loggedIn: false });
  try {
    const payload = jwt.verify(token, SECRET);
    res.json({ loggedIn: true, username: payload.username });
  } catch {
    res.json({ loggedIn: false });
  }
});

router.post('/change-password', async (req, res) => {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni.' });
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return res.status(401).json({ error: 'Niste prijavljeni.' });
  }
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nova lozinka mora imati barem 6 znakova.' });
  }
  const { rows } = await db.query('SELECT * FROM admin_users WHERE id = $1', [payload.id]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Trenutna lozinka nije točna.' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, user.id]);
  res.json({ ok: true });
});

module.exports = router;
