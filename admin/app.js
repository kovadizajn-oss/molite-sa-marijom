// --- Provjera prijave, inače natrag na login ---
(async function guard() {
  try {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    if (!data.loggedIn) window.location.href = 'index.html';
  } catch {
    window.location.href = 'index.html';
  }
})();

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmtDate(s) {
  if (!s) return '';
  return s.replace('T', ' ').slice(0, 16);
}
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Greška.');
  return data;
}

// --- Tabovi ---
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = 'index.html';
});

// --- Upload slike: šalje fajl na server, vraća javni URL ---
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Greška pri uploadu slike.');
  return data.url;
}

// --- Prikaz/skrivanje preview slike u formi ---
function setImagePreview(prefix, url) {
  const wrap = document.getElementById(prefix + 'ImagePreviewWrap');
  const img = document.getElementById(prefix + 'ImagePreview');
  const hidden = document.getElementById(prefix + 'ImageUrl');
  if (url) {
    img.src = url;
    wrap.style.display = '';
    hidden.value = url;
  } else {
    img.src = '';
    wrap.style.display = 'none';
    hidden.value = '';
  }
}

// ================= ANALYTICS =================
function fmtStat(row) {
  return { total: row ? row.total : 0, unique: row ? row.unique_visitors : 0 };
}
async function loadAnalytics() {
  try {
    const summary = await api('/api/admin/analytics/summary');
    const s7 = fmtStat(summary.last7Days);
    const s30 = fmtStat(summary.last30Days);
    const sAll = fmtStat(summary.allTime);
    document.getElementById('stat7Total').textContent = s7.total;
    document.getElementById('stat7Unique').textContent = s7.unique + ' jedinstvenih posjetitelja';
    document.getElementById('stat30Total').textContent = s30.total;
    document.getElementById('stat30Unique').textContent = s30.unique + ' jedinstvenih posjetitelja';
    document.getElementById('statAllTotal').textContent = sAll.total;
    document.getElementById('statAllUnique').textContent = sAll.unique + ' jedinstvenih posjetitelja';

    const pages = await api('/api/admin/analytics/pages');
    const tbody = document.querySelector('#pagesTable tbody');
    tbody.innerHTML = '';
    document.getElementById('pagesEmpty').style.display = pages.length ? 'none' : 'block';
    pages.forEach((p) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.tag ? `<span class="badge">${esc(p.tag)}</span>` : ''}</td><td>${esc(p.label)}</td><td>${p.views}</td>`;
      tbody.appendChild(tr);
    });
  } catch (e) {
    // tiho — analitika ne smije rušiti ostatak panela
  }
}

// ================= BLOG =================
async function loadBlog() {
  const [rows, ratings] = await Promise.all([
    api('/api/admin/blog'),
    api('/api/blog-ratings/summary').catch(() => ({})),
  ]);
  const tbody = document.querySelector('#blogTable tbody');
  tbody.innerHTML = '';
  document.getElementById('blogEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const rating = ratings[r.id];
    const ratingText = rating && rating.count ? `★ ${rating.average.toFixed(1)} (${rating.count})` : '—';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.title)}</td>
      <td>${esc(r.category)}</td>
      <td>${r.views || 0}</td>
      <td>${ratingText}</td>
      <td><span class="badge ${r.published ? 'published' : 'pending'}">${r.published ? 'objavljeno' : 'skriveno'}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="actions">
        <button class="btn secondary small" onclick="editBlog(${r.id})">Uredi</button>
        <button class="btn danger small" onclick="deleteBlog(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._blogRows = rows;
}
window.editBlog = function (id) {
  const r = window._blogRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('blogFormTitle').textContent = 'Uredi objavu';
  document.getElementById('blogId').value = r.id;
  document.getElementById('blogTitle').value = r.title;
  document.getElementById('blogCategory').value = r.category;
  document.getElementById('blogExcerpt').value = r.excerpt;
  document.getElementById('blogContent').value = r.content;
  document.getElementById('blogImageNote').value = r.image_note;
  document.getElementById('blogPublished').checked = !!r.published;
  document.getElementById('blogCancelBtn').style.display = 'inline-flex';
  document.getElementById('blogImageFile').value = '';
  setImagePreview('blog', r.image_url);
  window.scrollTo(0, 0);
};
document.getElementById('blogCancelBtn').addEventListener('click', () => resetBlogForm());
function resetBlogForm() {
  document.getElementById('blogFormTitle').textContent = 'Nova objava';
  document.getElementById('blogId').value = '';
  ['blogTitle','blogCategory','blogExcerpt','blogContent','blogImageNote'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('blogPublished').checked = true;
  document.getElementById('blogCancelBtn').style.display = 'none';
  document.getElementById('blogImageFile').value = '';
  setImagePreview('blog', '');
}
document.getElementById('blogImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('blogMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam sliku...</div>';
    const url = await uploadImage(file);
    setImagePreview('blog', url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('blogImageRemoveBtn').addEventListener('click', () => {
  document.getElementById('blogImageFile').value = '';
  setImagePreview('blog', '');
});
document.getElementById('blogSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('blogId').value;
  const body = {
    title: document.getElementById('blogTitle').value.trim(),
    category: document.getElementById('blogCategory').value.trim(),
    excerpt: document.getElementById('blogExcerpt').value.trim(),
    content: document.getElementById('blogContent').value.trim(),
    image_note: document.getElementById('blogImageNote').value.trim(),
    image_url: document.getElementById('blogImageUrl').value,
    published: document.getElementById('blogPublished').checked,
  };
  const msg = document.getElementById('blogMsg');
  if (!body.title) { msg.innerHTML = '<div class="msg err">Naslov je obavezan.</div>'; return; }
  try {
    if (id) await api('/api/admin/blog/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/blog', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetBlogForm();
    loadBlog();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});
window.deleteBlog = async function (id) {
  if (!confirm('Obrisati ovu objavu?')) return;
  await api('/api/admin/blog/' + id, { method: 'DELETE' });
  loadBlog();
};

// ================= HODOCASCA =================
async function loadHodo() {
  const rows = await api('/api/admin/hodocasca');
  const tbody = document.querySelector('#hodoTable tbody');
  tbody.innerHTML = '';
  document.getElementById('hodoEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.title)}</td>
      <td>${esc(r.location)}</td>
      <td>${esc(r.date_range)}</td>
      <td><span class="badge ${r.published ? 'published' : 'pending'}">${r.published ? 'objavljeno' : 'skriveno'}</span></td>
      <td class="actions">
        <button class="btn secondary small" onclick="editHodo(${r.id})">Uredi</button>
        <button class="btn danger small" onclick="deleteHodo(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._hodoRows = rows;
}
window.editHodo = function (id) {
  const r = window._hodoRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('hodoFormTitle').textContent = 'Uredi hodočašće';
  document.getElementById('hodoId').value = r.id;
  document.getElementById('hodoTitle').value = r.title;
  document.getElementById('hodoLocation').value = r.location;
  document.getElementById('hodoDate').value = r.date_range;
  document.getElementById('hodoImageNote').value = r.image_note;
  document.getElementById('hodoDescription').value = r.description;
  document.getElementById('hodoPublished').checked = !!r.published;
  document.getElementById('hodoCancelBtn').style.display = 'inline-flex';
  document.getElementById('hodoImageFile').value = '';
  setImagePreview('hodo', r.image_url);
  window.scrollTo(0, 0);
};
document.getElementById('hodoCancelBtn').addEventListener('click', () => resetHodoForm());
function resetHodoForm() {
  document.getElementById('hodoFormTitle').textContent = 'Novo hodočašće';
  document.getElementById('hodoId').value = '';
  ['hodoTitle','hodoLocation','hodoDate','hodoImageNote','hodoDescription'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('hodoPublished').checked = true;
  document.getElementById('hodoCancelBtn').style.display = 'none';
  document.getElementById('hodoImageFile').value = '';
  setImagePreview('hodo', '');
}
document.getElementById('hodoImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('hodoMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam sliku...</div>';
    const url = await uploadImage(file);
    setImagePreview('hodo', url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('hodoImageRemoveBtn').addEventListener('click', () => {
  document.getElementById('hodoImageFile').value = '';
  setImagePreview('hodo', '');
});
document.getElementById('hodoSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('hodoId').value;
  const body = {
    title: document.getElementById('hodoTitle').value.trim(),
    location: document.getElementById('hodoLocation').value.trim(),
    date_range: document.getElementById('hodoDate').value.trim(),
    image_note: document.getElementById('hodoImageNote').value.trim(),
    image_url: document.getElementById('hodoImageUrl').value,
    description: document.getElementById('hodoDescription').value.trim(),
    published: document.getElementById('hodoPublished').checked,
  };
  const msg = document.getElementById('hodoMsg');
  if (!body.title) { msg.innerHTML = '<div class="msg err">Naziv je obavezan.</div>'; return; }
  try {
    if (id) await api('/api/admin/hodocasca/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/hodocasca', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetHodoForm();
    loadHodo();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});
window.deleteHodo = async function (id) {
  if (!confirm('Obrisati ovo hodočašće?')) return;
  await api('/api/admin/hodocasca/' + id, { method: 'DELETE' });
  loadHodo();
};

// ================= MOLITVE =================
const MOLITVA_CATEGORY_LABELS = {
  'osnovne-molitve': 'Osnovne molitve',
  'krunica': 'Krunica',
  'prigodne-molitve': 'Prigodne molitve',
  'litanije': 'Litanije',
  'razne-molitve': 'Razne molitve',
};
async function loadMolitve() {
  const rows = await api('/api/molitve');
  const tbody = document.querySelector('#molitvaTable tbody');
  tbody.innerHTML = '';
  document.getElementById('molitvaEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(MOLITVA_CATEGORY_LABELS[r.category] || r.category)}</td>
      <td>${esc(r.title)}</td>
      <td class="actions">
        <button class="btn secondary small" onclick="editMolitva(${r.id})">Uredi</button>
        <button class="btn danger small" onclick="deleteMolitva(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._molitvaRows = rows;
}
window.editMolitva = function (id) {
  const r = window._molitvaRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('molitvaFormTitle').textContent = 'Uredi molitvu';
  document.getElementById('molitvaId').value = r.id;
  document.getElementById('molitvaCategory').value = r.category;
  document.getElementById('molitvaTitle').value = r.title;
  document.getElementById('molitvaText').value = r.text;
  document.getElementById('molitvaCancelBtn').style.display = 'inline-flex';
  window.scrollTo(0, 0);
};
document.getElementById('molitvaCancelBtn').addEventListener('click', () => resetMolitvaForm());
function resetMolitvaForm() {
  document.getElementById('molitvaFormTitle').textContent = 'Nova molitva';
  document.getElementById('molitvaId').value = '';
  document.getElementById('molitvaCategory').value = 'osnovne-molitve';
  document.getElementById('molitvaTitle').value = '';
  document.getElementById('molitvaText').value = '';
  document.getElementById('molitvaCancelBtn').style.display = 'none';
}
document.getElementById('molitvaSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('molitvaId').value;
  const body = {
    category: document.getElementById('molitvaCategory').value,
    title: document.getElementById('molitvaTitle').value.trim(),
    text: document.getElementById('molitvaText').value.trim(),
  };
  const msg = document.getElementById('molitvaMsg');
  if (!body.title) { msg.innerHTML = '<div class="msg err">Naslov je obavezan.</div>'; return; }
  if (!body.text) { msg.innerHTML = '<div class="msg err">Tekst molitve je obavezan.</div>'; return; }
  try {
    if (id) await api('/api/admin/molitve/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/molitve', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetMolitvaForm();
    loadMolitve();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});
window.deleteMolitva = async function (id) {
  if (!confirm('Obrisati ovu molitvu?')) return;
  await api('/api/admin/molitve/' + id, { method: 'DELETE' });
  loadMolitve();
};
loadMolitve();

// ================= BOOKS =================
// PDF ide izravno iz preglednika u Supabase Storage (ne kroz našu Vercel funkciju),
// jer Vercel serverless funkcije odbijaju zahtjeve veće od 4.5MB — a knjige lako prijeđu to.
// Naša /api/admin/pdf-signed-upload ruta samo izda kratkotrajan potpisan link za upload.
let _supabaseClientPromise = null;
async function getSupabaseClient() {
  if (!_supabaseClientPromise) {
    _supabaseClientPromise = fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
          throw new Error('Supabase nije konfiguriran (nedostaje SUPABASE_ANON_KEY na serveru).');
        }
        return { client: window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey), bucket: cfg.supabaseBucket };
      });
  }
  return _supabaseClientPromise;
}
async function uploadPdf(file) {
  const signed = await api('/api/admin/pdf-signed-upload', {
    method: 'POST',
    body: JSON.stringify({ filename: file.name }),
  });
  const { client } = await getSupabaseClient();
  const { error } = await client.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file);
  if (error) throw new Error(error.message || 'Greška pri uploadu PDF-a.');
  return signed.publicUrl;
}
function setPdfStatus(url) {
  const status = document.getElementById('bookPdfStatus');
  const hidden = document.getElementById('bookPdfUrl');
  hidden.value = url || '';
  status.textContent = url ? '✓ PDF uploadan' : '';
}
async function loadBooks() {
  const rows = await api('/api/admin/books');
  const tbody = document.querySelector('#bookTable tbody');
  tbody.innerHTML = '';
  document.getElementById('bookEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.title)}</td>
      <td>${esc(r.author || '—')}</td>
      <td><span class="badge ${r.published ? 'published' : 'pending'}">${r.published ? 'objavljeno' : 'skriveno'}</span></td>
      <td class="actions">
        <button class="btn secondary small" onclick="editBook(${r.id})">Uredi</button>
        <button class="btn danger small" onclick="deleteBook(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._bookRows = rows;
}
window.editBook = function (id) {
  const r = window._bookRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('bookFormTitle').textContent = 'Uredi knjigu';
  document.getElementById('bookId').value = r.id;
  document.getElementById('bookTitle').value = r.title;
  document.getElementById('bookAuthor').value = r.author || '';
  document.getElementById('bookDescription').value = r.description || '';
  document.getElementById('bookPublished').checked = !!r.published;
  document.getElementById('bookCancelBtn').style.display = 'inline-flex';
  document.getElementById('bookImageFile').value = '';
  setImagePreview('book', r.cover_image_url);
  document.getElementById('bookPdfFile').value = '';
  setPdfStatus(r.pdf_url);
  window.scrollTo(0, 0);
};
document.getElementById('bookCancelBtn').addEventListener('click', () => resetBookForm());
function resetBookForm() {
  document.getElementById('bookFormTitle').textContent = 'Nova knjiga';
  document.getElementById('bookId').value = '';
  ['bookTitle', 'bookAuthor', 'bookDescription'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('bookPublished').checked = true;
  document.getElementById('bookCancelBtn').style.display = 'none';
  document.getElementById('bookImageFile').value = '';
  setImagePreview('book', '');
  document.getElementById('bookPdfFile').value = '';
  setPdfStatus('');
}
document.getElementById('bookImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('bookMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam naslovnicu...</div>';
    const url = await uploadImage(file);
    setImagePreview('book', url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('bookImageRemoveBtn').addEventListener('click', () => {
  document.getElementById('bookImageFile').value = '';
  setImagePreview('book', '');
});
document.getElementById('bookPdfFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('bookMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam PDF...</div>';
    const url = await uploadPdf(file);
    setPdfStatus(url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('bookSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('bookId').value;
  const body = {
    title: document.getElementById('bookTitle').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    description: document.getElementById('bookDescription').value.trim(),
    cover_image_url: document.getElementById('bookImageUrl').value,
    pdf_url: document.getElementById('bookPdfUrl').value,
    published: document.getElementById('bookPublished').checked,
  };
  const msg = document.getElementById('bookMsg');
  if (!body.title) { msg.innerHTML = '<div class="msg err">Naslov je obavezan.</div>'; return; }
  if (!body.pdf_url) { msg.innerHTML = '<div class="msg err">Uploadaj PDF datoteku.</div>'; return; }
  try {
    if (id) await api('/api/admin/books/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/books', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetBookForm();
    loadBooks();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});
window.deleteBook = async function (id) {
  if (!confirm('Obrisati ovu knjigu?')) return;
  await api('/api/admin/books/' + id, { method: 'DELETE' });
  loadBooks();
};
loadBooks();

// ================= PRAYERS =================
async function loadPrayers() {
  const rows = await api('/api/admin/prayers');
  const tbody = document.querySelector('#prayersTable tbody');
  tbody.innerHTML = '';
  document.getElementById('prayersEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.anonymous ? 'Anonimno' : esc(r.name || '—')}</td>
      <td style="max-width:320px;">${esc(r.message)}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${r.pray_count}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="actions">
        ${r.status !== 'approved' ? `<button class="btn small" onclick="setPrayerStatus(${r.id},'approved')">Odobri</button>` : ''}
        ${r.status !== 'rejected' ? `<button class="btn secondary small" onclick="setPrayerStatus(${r.id},'rejected')">Odbij</button>` : ''}
        <button class="btn danger small" onclick="deletePrayer(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
window.setPrayerStatus = async function (id, status) {
  await api('/api/admin/prayers/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
  loadPrayers();
};
window.deletePrayer = async function (id) {
  if (!confirm('Obrisati ovu nakanu?')) return;
  await api('/api/admin/prayers/' + id, { method: 'DELETE' });
  loadPrayers();
};

// ================= TESTIMONIES =================
async function loadTestimonies() {
  const rows = await api('/api/admin/testimonies');
  const tbody = document.querySelector('#testimoniesTable tbody');
  tbody.innerHTML = '';
  document.getElementById('testimoniesEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    const isAdmin = r.source === 'admin';
    tr.innerHTML = `
      <td>${esc(r.name || 'Anonimno')}</td>
      <td>${esc(r.email) || '—'}</td>
      <td>${esc(r.title) || '—'}</td>
      <td style="max-width:280px;">${esc(r.story)}</td>
      <td>${isAdmin ? 'Marija' : 'Korisnik'}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="actions">
        ${isAdmin ? `<button class="btn secondary small" onclick="editTestimony(${r.id})">Uredi</button>` : ''}
        ${!isAdmin && r.status !== 'approved' ? `<button class="btn small" onclick="setTestimonyStatus(${r.id},'approved')">Odobri</button>` : ''}
        ${!isAdmin && r.status !== 'rejected' ? `<button class="btn secondary small" onclick="setTestimonyStatus(${r.id},'rejected')">Odbij</button>` : ''}
        <button class="btn danger small" onclick="deleteTestimony(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._testimonyRows = rows;
}
window.setTestimonyStatus = async function (id, status) {
  await api('/api/admin/testimonies/' + id, { method: 'PATCH', body: JSON.stringify({ status }) });
  loadTestimonies();
};
window.deleteTestimony = async function (id) {
  if (!confirm('Obrisati ovo svjedočanstvo?')) return;
  await api('/api/admin/testimonies/' + id, { method: 'DELETE' });
  loadTestimonies();
};
window.editTestimony = function (id) {
  const r = window._testimonyRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('adminTestFormTitle').textContent = 'Uredi svjedočanstvo';
  document.getElementById('adminTestId').value = r.id;
  document.getElementById('adminTestName').value = r.name;
  document.getElementById('adminTestTitle').value = r.title;
  document.getElementById('adminTestStory').value = r.story;
  document.getElementById('adminTestPublished').checked = r.status === 'approved';
  document.getElementById('adminTestCancelBtn').style.display = 'inline-flex';
  document.getElementById('adminTestImageFile').value = '';
  setImagePreview('adminTest', r.image_url);
  window.scrollTo(0, 0);
};
document.getElementById('adminTestCancelBtn').addEventListener('click', () => resetTestimonyForm());
function resetTestimonyForm() {
  document.getElementById('adminTestFormTitle').textContent = 'Novo svjedočanstvo';
  document.getElementById('adminTestId').value = '';
  ['adminTestName','adminTestTitle','adminTestStory'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('adminTestPublished').checked = true;
  document.getElementById('adminTestCancelBtn').style.display = 'none';
  document.getElementById('adminTestImageFile').value = '';
  setImagePreview('adminTest', '');
}
document.getElementById('adminTestImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('adminTestMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam sliku...</div>';
    const url = await uploadImage(file);
    setImagePreview('adminTest', url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('adminTestImageRemoveBtn').addEventListener('click', () => {
  document.getElementById('adminTestImageFile').value = '';
  setImagePreview('adminTest', '');
});
document.getElementById('adminTestSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('adminTestId').value;
  const body = {
    name: document.getElementById('adminTestName').value.trim(),
    title: document.getElementById('adminTestTitle').value.trim(),
    story: document.getElementById('adminTestStory').value.trim(),
    image_url: document.getElementById('adminTestImageUrl').value,
    published: document.getElementById('adminTestPublished').checked,
  };
  const msg = document.getElementById('adminTestMsg');
  if (!body.story) { msg.innerHTML = '<div class="msg err">Priča je obavezna.</div>'; return; }
  try {
    if (id) await api('/api/admin/testimonies/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/testimonies', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetTestimonyForm();
    loadTestimonies();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});

// ================= QUESTIONS =================
async function loadQuestions() {
  const rows = await api('/api/admin/questions');
  const tbody = document.querySelector('#questionsTable tbody');
  tbody.innerHTML = '';
  document.getElementById('questionsEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.name || 'Anonimno')}</td>
      <td>${esc(r.email) || '—'}</td>
      <td style="max-width:260px;">${esc(r.question)}</td>
      <td style="max-width:260px;">
        <textarea class="field" style="min-height:60px;font-size:.8rem;" id="answer-${r.id}">${esc(r.answer)}</textarea>
      </td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td class="actions">
        <button class="btn small" onclick="answerQuestion(${r.id})">Spremi i objavi</button>
        <button class="btn danger small" onclick="deleteQuestion(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
}
window.answerQuestion = async function (id) {
  const answer = document.getElementById('answer-' + id).value.trim();
  if (!answer) { alert('Upiši odgovor prije objave.'); return; }
  await api('/api/admin/questions/' + id, { method: 'PATCH', body: JSON.stringify({ answer, status: 'published' }) });
  loadQuestions();
};
window.deleteQuestion = async function (id) {
  if (!confirm('Obrisati ovo pitanje?')) return;
  await api('/api/admin/questions/' + id, { method: 'DELETE' });
  loadQuestions();
};

// ================= DAILY THOUGHT =================
async function loadDailyThoughts() {
  const rows = await api('/api/admin/daily-thoughts');
  const tbody = document.querySelector('#dtTable tbody');
  tbody.innerHTML = '';
  document.getElementById('dtEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="max-width:360px;">${esc(r.quote)}</td>
      <td>${esc(r.source) || '—'}</td>
      <td><span class="badge ${r.published ? 'published' : 'pending'}">${r.published ? 'objavljeno' : 'skriveno'}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="actions">
        <button class="btn secondary small" onclick="editDailyThought(${r.id})">Uredi</button>
        <button class="btn danger small" onclick="deleteDailyThought(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
  window._dtRows = rows;
}
window.editDailyThought = function (id) {
  const r = window._dtRows.find((x) => x.id === id);
  if (!r) return;
  document.getElementById('dtFormTitle').textContent = 'Uredi misao dana';
  document.getElementById('dtId').value = r.id;
  document.getElementById('dtQuote').value = r.quote;
  document.getElementById('dtSource').value = r.source;
  document.getElementById('dtPublished').checked = !!r.published;
  document.getElementById('dtCancelBtn').style.display = 'inline-flex';
  document.getElementById('dtImageFile').value = '';
  setImagePreview('dt', r.image_url);
  window.scrollTo(0, 0);
};
document.getElementById('dtCancelBtn').addEventListener('click', () => resetDailyThoughtForm());
function resetDailyThoughtForm() {
  document.getElementById('dtFormTitle').textContent = 'Nova misao dana';
  document.getElementById('dtId').value = '';
  ['dtQuote','dtSource'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('dtPublished').checked = true;
  document.getElementById('dtCancelBtn').style.display = 'none';
  document.getElementById('dtImageFile').value = '';
  setImagePreview('dt', '');
}
document.getElementById('dtImageFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('dtMsg');
  try {
    msg.innerHTML = '<div class="msg">Uploadam sliku...</div>';
    const url = await uploadImage(file);
    setImagePreview('dt', url);
    msg.innerHTML = '';
  } catch (err) {
    msg.innerHTML = `<div class="msg err">${esc(err.message)}</div>`;
  }
});
document.getElementById('dtImageRemoveBtn').addEventListener('click', () => {
  document.getElementById('dtImageFile').value = '';
  setImagePreview('dt', '');
});
document.getElementById('dtSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('dtId').value;
  const body = {
    quote: document.getElementById('dtQuote').value.trim(),
    source: document.getElementById('dtSource').value.trim(),
    image_url: document.getElementById('dtImageUrl').value,
    published: document.getElementById('dtPublished').checked,
  };
  const msg = document.getElementById('dtMsg');
  if (!body.quote) { msg.innerHTML = '<div class="msg err">Misao je obavezna.</div>'; return; }
  try {
    if (id) await api('/api/admin/daily-thoughts/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/daily-thoughts', { method: 'POST', body: JSON.stringify(body) });
    msg.innerHTML = '<div class="msg ok">Spremljeno.</div>';
    resetDailyThoughtForm();
    loadDailyThoughts();
    setTimeout(() => (msg.innerHTML = ''), 2500);
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});
window.deleteDailyThought = async function (id) {
  if (!confirm('Obrisati ovu misao dana?')) return;
  await api('/api/admin/daily-thoughts/' + id, { method: 'DELETE' });
  loadDailyThoughts();
};

// ================= SETTINGS =================
document.getElementById('changePwBtn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const msg = document.getElementById('pwMsg');
  try {
    await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    msg.innerHTML = '<div class="msg ok">Lozinka je promijenjena.</div>';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
  } catch (e) {
    msg.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
  }
});

// --- init ---
loadAnalytics();
loadBlog();
loadHodo();
loadPrayers();
loadTestimonies();
loadQuestions();
loadDailyThoughts();
