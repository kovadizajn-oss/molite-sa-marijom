const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');
const { uploadToSupabase } = require('../lib/supabaseStorage');

const router = express.Router();

// --- Admin: upload jedne slike, vraća javni URL do nje (Supabase Storage) ---
router.post('/admin/upload', requireAdmin, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Greška pri uploadu slike.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nije poslana nijedna slika.' });
    }
    try {
      const url = await uploadToSupabase(req.file);
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Greška pri spremanju slike.' });
    }
  });
});

module.exports = router;
