const { createClient } = require('@supabase/supabase-js');
const path = require('node:path');
const crypto = require('node:crypto');

const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Šalje datoteku (iz memorije, preko multera) u Supabase Storage i vraća njen javni URL.
async function uploadToSupabase(file) {
  if (!supabase) {
    throw new Error('Supabase Storage nije konfiguriran (nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const name = crypto.randomBytes(8).toString('hex') + ext;

  const { error } = await supabase.storage.from(BUCKET).upload(name, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return data.publicUrl;
}

module.exports = { uploadToSupabase };
