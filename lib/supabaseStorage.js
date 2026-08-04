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

// Za velike datoteke (npr. PDF knjige) preglednik šalje bajtove izravno u Supabase,
// zaobilazeći Vercel serverless funkciju koja ima tvrdo ograničenje od 4.5MB po zahtjevu.
// Ova funkcija (pokreće se na serveru, service_role ključem) samo izdaje kratkotrajan,
// potpisan link + token za jedan konkretan upload — sam upload ide izravno u Supabase.
async function createSignedUploadUrl(originalName) {
  if (!supabase) {
    throw new Error('Supabase Storage nije konfiguriran (nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  const ext = path.extname(originalName).toLowerCase();
  const name = crypto.randomBytes(8).toString('hex') + ext;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(name);
  if (error) throw new Error(error.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(name);
  return { path: data.path, token: data.token, bucket: BUCKET, publicUrl: pub.publicUrl };
}

module.exports = { uploadToSupabase, createSignedUploadUrl };
