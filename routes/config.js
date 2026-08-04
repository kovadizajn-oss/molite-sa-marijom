const express = require('express');

const router = express.Router();

// Javni, neosjetljivi podaci koje treba i sam preglednik (npr. admin panel za izravan
// upload velikih datoteka u Supabase). SUPABASE_ANON_KEY je namjerno javan ključ —
// tajni service_role ključ nikad ne izlazi izvan servera.
router.get('/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseBucket: process.env.SUPABASE_BUCKET || 'uploads',
  });
});

module.exports = router;
