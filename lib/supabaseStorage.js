const { createClient } = require('@supabase/supabase-js');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const BUCKET = process.env.SUPABASE_BUCKET || 'uploads';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Slike (npr. s AI generatora) znaju stići kao vrlo veliki PNG (nekoliko MB), što Facebook
// još nekako podnese, ali WhatsAppov "crawler" za pregled linka je puno stroži pa takvu sliku
// jednostavno preskoči (link se podijeli bez slike). Zato svaku sliku smanjimo na razumnu
// širinu i pretvorimo u kompresirani JPEG prije spremanja — puno manja datoteka, brže se
// učitava svima, i pouzdano radi u pregledima linkova na WhatsAppu/Facebooku/itd.
// GIF-ove ne diramo da ne izgubimo animaciju.
async function optimizeImage(file) {
  if (!file.mimetype || !file.mimetype.startsWith('image/') || file.mimetype === 'image/gif') {
    return { buffer: file.buffer, contentType: file.mimetype, ext: path.extname(file.originalname).toLowerCase() };
  }
  try {
    const buffer = await sharp(file.buffer)
      .rotate() // poštuje EXIF orijentaciju (npr. slike s mobitela)
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg', ext: '.jpg' };
  } catch (e) {
    // Ako optimizacija iz nekog razloga ne uspije, radije pošalji original nego da upload padne.
    return { buffer: file.buffer, contentType: file.mimetype, ext: path.extname(file.originalname).toLowerCase() };
  }
}

// Šalje datoteku (iz memorije, preko multera) u Supabase Storage i vraća njen javni URL.
async function uploadToSupabase(file) {
  if (!supabase) {
    throw new Error('Supabase Storage nije konfiguriran (nedostaju SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  const { buffer, contentType, ext } = await optimizeImage(file);
  const name = crypto.randomBytes(8).toString('hex') + ext;

  const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
    contentType,
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
