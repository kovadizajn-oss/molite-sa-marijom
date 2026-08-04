const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const upload = require('../middleware/upload');
const uploadPdf = require('../middleware/uploadPdf');
const { uploadToSupabase, createSignedUploadUrl } = require('../lib/supabaseStorage');

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

// --- Admin: upload PDF knjige, vraća javni URL do nje (Supabase Storage) ---
router.post('/admin/upload-pdf', requireAdmin, (req, res) => {
  uploadPdf.single('pdf')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Greška pri uploadu PDF-a.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Nije poslan nijedan PDF.' });
    }
    try {
      const url = await uploadToSupabase(req.file);
      res.json({ url });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Greška pri spremanju PDF-a.' });
    }
  });
});

// --- Admin: izdaje potpisan link za izravan upload velike datoteke (npr. PDF knjige)
// iz preglednika u Supabase Storage — zaobilazi Vercelovo ograničenje od 4.5MB po zahtjevu
// jer sama datoteka nikad ne prolazi kroz našu serverless funkciju. ---
router.post('/admin/pdf-signed-upload', requireAdmin, async (req, res) => {
  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: 'Nedostaje naziv datoteke.' });
  try {
    const result = await createSignedUploadUrl(filename);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Greška pri pripremi uploada.' });
  }
});

module.exports = router;
