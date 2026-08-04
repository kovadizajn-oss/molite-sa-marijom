const multer = require('multer');
const path = require('node:path');

// Isto kao middleware/upload.js (slike), ali za PDF knjige — drži se u memoriji
// pa se odmah šalje na Supabase Storage (nema trajnog diska na Vercelu).
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.pdf') {
    return cb(new Error('Dozvoljen je samo PDF.'));
  }
  cb(null, true);
}

const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

module.exports = uploadPdf;
