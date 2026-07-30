const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'promijeni-ovu-tajnu-u-produkciji';

module.exports = function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) {
    return res.status(401).json({ error: 'Niste prijavljeni.' });
  }
  try {
    req.admin = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Niste prijavljeni.' });
  }
};
