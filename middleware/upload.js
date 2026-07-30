const multer = require('multer');
const path = require('node:path');

// Na Vercelu nema trajnog diska pa se slika drži u memoriji i odmah šalje na Supabase Storage
// (vidi lib/supabaseStorage.js i routes/upload.js).
const storage = multer.memoryStorage();

const ALLOWED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return cb(new Error('Dozvoljene su samo slike (jpg, png, webp, gif).'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
