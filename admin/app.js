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

// ================= BLOG =================
async function loadBlog() {
  const rows = await api('/api/admin/blog');
  const tbody = document.querySelector('#blogTable tbody');
  tbody.innerHTML = '';
  document.getElementById('blogEmpty').style.display = rows.length ? 'none' : 'block';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(r.title)}</td>
      <td>${esc(r.category)}</td>
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
  window.scrollTo(0, 0);
};
document.getElementById('blogCancelBtn').addEventListener('click', () => resetBlogForm());
function resetBlogForm() {
  document.getElementById('blogFormTitle').textContent = 'Nova objava';
  document.getElementById('blogId').value = '';
  ['blogTitle','blogCategory','blogExcerpt','blogContent','blogImageNote'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('blogPublished').checked = true;
  document.getElementById('blogCancelBtn').style.display = 'none';
}
document.getElementById('blogSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('blogId').value;
  const body = {
    title: document.getElementById('blogTitle').value.trim(),
    category: document.getElementById('blogCategory').value.trim(),
    excerpt: document.getElementById('blogExcerpt').value.trim(),
    content: document.getElementById('blogContent').value.trim(),
    image_note: document.getElementById('blogImageNote').value.trim(),
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
  window.scrollTo(0, 0);
};
document.getElementById('hodoCancelBtn').addEventListener('click', () => resetHodoForm());
function resetHodoForm() {
  document.getElementById('hodoFormTitle').textContent = 'Novo hodočašće';
  document.getElementById('hodoId').value = '';
  ['hodoTitle','hodoLocation','hodoDate','hodoImageNote','hodoDescription'].forEach((id) => document.getElementById(id).value = '');
  document.getElementById('hodoPublished').checked = true;
  document.getElementById('hodoCancelBtn').style.display = 'none';
}
document.getElementById('hodoSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('hodoId').value;
  const body = {
    title: document.getElementById('hodoTitle').value.trim(),
    location: document.getElementById('hodoLocation').value.trim(),
    date_range: document.getElementById('hodoDate').value.trim(),
    image_note: document.getElementById('hodoImageNote').value.trim(),
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
    tr.innerHTML = `
      <td>${esc(r.name || 'Anonimno')}</td>
      <td>${esc(r.email) || '—'}</td>
      <td style="max-width:320px;">${esc(r.story)}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
      <td>${fmtDate(r.created_at)}</td>
      <td class="actions">
        ${r.status !== 'approved' ? `<button class="btn small" onclick="setTestimonyStatus(${r.id},'approved')">Odobri</button>` : ''}
        ${r.status !== 'rejected' ? `<button class="btn secondary small" onclick="setTestimonyStatus(${r.id},'rejected')">Odbij</button>` : ''}
        <button class="btn danger small" onclick="deleteTestimony(${r.id})">Obriši</button>
      </td>`;
    tbody.appendChild(tr);
  });
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
loadBlog();
loadHodo();
loadPrayers();
loadTestimonies();
loadQuestions();
