/* ============================================================
   ACADEMY — curso.js
   Detail page: reads ?id=slug from the URL, fetches the CSV,
   finds the matching course and renders it.
   Does NOT modify or depend on script.js internals.
   ============================================================ */

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/1-vmZvDofUCJmafpypyUTJdgr0KLg55b5LUEucVIda5Q/export?format=csv';

document.getElementById('year').textContent = new Date().getFullYear();

// ─── Get slug from URL ────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const slugParam = params.get('id');

if (!slugParam) {
  showError('No se especificó ningún curso.');
} else {
  loadCourse(slugParam);
}

// ─── Main flow ────────────────────────────────────────────
async function loadCourse(slug) {
  try {
    const raw     = await fetchCSV(CSV_URL);
    const courses = parseCSV(raw);
    const course  = courses.find(c => toSlug(c['Title']) === slug);

    if (!course) {
      showError(`No se encontró el curso con id "${slug}".`);
      return;
    }

    renderDetail(course);
  } catch (err) {
    showError(err.message || 'Error al cargar los datos.');
  }
}

// ─── Render ───────────────────────────────────────────────
function renderDetail(course) {
  document.title = `${course['Title']} — Academy`;

  // Image
  const imgWrap = document.getElementById('detail-image-wrap');
  if (course['Image']) {
    const img = document.createElement('img');
    img.src   = course['Image'];
    img.alt   = course['Title'];
    img.className = 'detail-image';
    img.onerror = () => img.remove();
    imgWrap.appendChild(img);
  }

  // Text fields
  document.getElementById('detail-category').textContent    = course['Category']    || '';
  document.getElementById('detail-title').textContent       = course['Title']        || '';
  document.getElementById('detail-description').textContent = course['Description']  || 'Sin descripción disponible.';

  // Meta pills
  const meta = document.getElementById('detail-meta');
  if (course['Duration']) meta.appendChild(makePill('⏱', course['Duration']));
  if (course['Audience']) meta.appendChild(makePill('👤', course['Audience']));

  // CTA button
  const cta = document.getElementById('detail-cta');
  if (course['Link']) {
    cta.href = course['Link'];
  } else {
    cta.style.display = 'none';
  }

  // Show card, hide loading
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('detail-card').classList.remove('hidden');
}

// ─── Error state ──────────────────────────────────────────
function showError(msg) {
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('error-message').textContent = msg;
  document.getElementById('error-state').classList.remove('hidden');
}

// ─── CSV helpers (same logic as script.js, self-contained) ─
async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseCSV(text) {
  const rows = splitCSVRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => { obj[header] = (row[i] || '').trim(); });
      return obj;
    })
    .filter(c => c['Title']);
}

function splitCSVRows(text) {
  const rows = [];
  let current = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(cell); cell = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        current.push(cell); rows.push(current); current = []; cell = '';
      } else if (ch === '\r') {
        current.push(cell); rows.push(current); current = []; cell = '';
      } else { cell += ch; }
    }
  }
  if (cell || current.length > 0) { current.push(cell); rows.push(current); }
  return rows;
}

// ─── Utilities ────────────────────────────────────────────
function toSlug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function makePill(icon, text) {
  const pill = document.createElement('span');
  pill.className = 'meta-pill';
  const ico = document.createElement('span');
  ico.className = 'pill-icon';
  ico.setAttribute('aria-hidden', 'true');
  ico.textContent = icon;
  pill.appendChild(ico);
  pill.appendChild(document.createTextNode(text));
  return pill;
}
