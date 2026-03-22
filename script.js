/* ============================================================
   ACADEMY COURSE CATALOG — script.js
   ============================================================ */

const CSV_URL =
'https://docs.google.com/spreadsheets/d/1-vmZvDofUCJmafpypyUTJdgr0KLg55b5LUEucVIda5Q/export?format=csv';

// ─── State ────────────────────────────────────────────────
let allCourses = [];
let activeFilters = { category: '', audience: '' };

// ─── DOM refs ─────────────────────────────────────────────
const grid          = document.getElementById('catalog-grid');
const loadingState  = document.getElementById('loading-state');
const emptyState    = document.getElementById('empty-state');
const errorState    = document.getElementById('error-state');
const errorMessage  = document.getElementById('error-message');
const courseCount   = document.getElementById('course-count');
const filterCat     = document.getElementById('filter-category');
const filterAud     = document.getElementById('filter-audience');
const resetBtn      = document.getElementById('reset-filters');
const yearSpan      = document.getElementById('year');

// ─── Init ─────────────────────────────────────────────────
yearSpan.textContent = new Date().getFullYear();

(async function init() {
  try {
    const raw = await fetchCSV(CSV_URL);
    allCourses = parseCSV(raw);
    populateFilters(allCourses);
    renderCourses(allCourses);
  } catch (err) {
    showError(err.message || 'Could not load course data. Please try again later.');
  }
})();

// ─── CSV Fetching ──────────────────────────────────────────
async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Network error: ${res.status} ${res.statusText}`);
  return res.text();
}

// ─── CSV Parsing ──────────────────────────────────────────
/**
 * Robust CSV parser that handles quoted fields (commas + newlines inside quotes).
 * Returns an array of objects keyed by the first-row headers.
 */
function parseCSV(text) {
  const rows = splitCSVRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim());

  return rows.slice(1)
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = (row[i] || '').trim();
      });
      return obj;
    })
    .filter(course => course['Title']); // skip blank rows
}

function splitCSVRows(text) {
  const rows = [];
  let current = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"')            { inQuotes = false; }
      else                            { cell += ch; }
    } else {
      if (ch === '"')  { inQuotes = true; }
      else if (ch === ',') { current.push(cell); cell = ''; }
      else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++; // skip \n of \r\n
        current.push(cell);
        rows.push(current);
        current = [];
        cell = '';
      } else if (ch === '\r') {
        current.push(cell);
        rows.push(current);
        current = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
  }

  // Last cell / row
  if (cell || current.length > 0) {
    current.push(cell);
    rows.push(current);
  }

  return rows;
}

// ─── Filters ──────────────────────────────────────────────
function populateFilters(courses) {
  const categories = [...new Set(courses.map(c => c['Category']).filter(Boolean))].sort();
  const audiences  = [...new Set(courses.map(c => c['Audience']).filter(Boolean))].sort();

  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCat.appendChild(opt);
  });

  audiences.forEach(aud => {
    const opt = document.createElement('option');
    opt.value = aud;
    opt.textContent = aud;
    filterAud.appendChild(opt);
  });
}

filterCat.addEventListener('change', () => {
  activeFilters.category = filterCat.value;
  applyFilters();
});

filterAud.addEventListener('change', () => {
  activeFilters.audience = filterAud.value;
  applyFilters();
});

resetBtn.addEventListener('click', () => {
  activeFilters = { category: '', audience: '' };
  filterCat.value = '';
  filterAud.value = '';
  applyFilters();
});

function applyFilters() {
  const filtered = allCourses.filter(course => {
    const matchCat = !activeFilters.category || course['Category'] === activeFilters.category;
    const matchAud = !activeFilters.audience || course['Audience']  === activeFilters.audience;
    return matchCat && matchAud;
  });
  renderCourses(filtered);
}

// ─── Rendering ────────────────────────────────────────────
function renderCourses(courses) {
  loadingState.classList.add('hidden');
  grid.innerHTML = '';

  if (courses.length === 0) {
    emptyState.classList.remove('hidden');
    courseCount.textContent = '0 courses';
    return;
  }

  emptyState.classList.add('hidden');
  courseCount.textContent = `${courses.length} course${courses.length !== 1 ? 's' : ''}`;

  const fragment = document.createDocumentFragment();
  courses.forEach(course => {
    fragment.appendChild(buildCard(course));
  });
  grid.appendChild(fragment);
}

function buildCard(course) {
  const card = document.createElement('article');
  card.className = 'course-card';

  // Image
  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-image-wrap';

  if (course['Image']) {
    const img = document.createElement('img');
    img.src = course['Image'];
    img.alt = course['Title'];
    img.loading = 'lazy';
    img.onerror = () => {
      img.replaceWith(makePlaceholder(course['Category']));
    };
    imgWrap.appendChild(img);
  } else {
    imgWrap.appendChild(makePlaceholder(course['Category']));
  }

  if (course['Category']) {
    const ribbon = document.createElement('span');
    ribbon.className = 'card-category-ribbon';
    ribbon.textContent = course['Category'];
    imgWrap.appendChild(ribbon);
  }

  // Body
  const body = document.createElement('div');
  body.className = 'card-body';

  const title = document.createElement('h2');
  title.className = 'card-title';
  title.textContent = course['Title'];

  const meta = document.createElement('div');
  meta.className = 'card-meta';

  if (course['Duration']) {
    meta.appendChild(makePill('⏱', course['Duration']));
  }
  if (course['Audience']) {
    meta.appendChild(makePill('👤', course['Audience']));
  }

  const desc = document.createElement('p');
  desc.className = 'card-description';
  desc.textContent = course['Description'] || 'No description available.';

  body.appendChild(title);
  // ADD this block right before: body.appendChild(title);
  const hasLink = course['Link'] && course['Link'].trim() !== '';
if (!hasLink) {
  const badge = document.createElement('span');
  badge.className = 'coming-soon-badge';
  badge.textContent = 'Próximamente';
  body.appendChild(badge);
}
  if (meta.children.length) body.appendChild(meta);
  body.appendChild(desc);

  // Footer / CTA
  const footer = document.createElement('div');
  footer.className = 'card-footer';

 // BEFORE
const btn = document.createElement('a');
btn.className = 'btn-view';
btn.textContent = 'View course';
btn.href = course['Link'] || '#';
btn.target = '_blank';
btn.rel = 'noopener noreferrer';
if (!course['Link']) btn.setAttribute('aria-disabled', 'true');

// AFTER

btn.className = 'btn-view' + (hasLink ? '' : ' btn-disabled');
btn.textContent = 'View course';
btn.href = hasLink ? course['Link'] : '#';
if (hasLink) {
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
} else {
  btn.setAttribute('aria-disabled', 'true');
  btn.addEventListener('click', e => e.preventDefault());
}

  // Arrow icon
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>';
  btn.appendChild(svg);

  footer.appendChild(btn);

  // Assemble card
  card.appendChild(imgWrap);
  card.appendChild(body);
  card.appendChild(footer);

  return card;
}

function makePill(icon, text) {
  const pill = document.createElement('span');
  pill.className = 'meta-pill';
  pill.innerHTML = `<span class="pill-icon" aria-hidden="true">${icon}</span>${escapeHTML(text)}`;
  return pill;
}

function makePlaceholder(category) {
  const icons = {
    'Design'      : '🎨',
    'Development' : '💻',
    'Marketing'   : '📣',
    'Business'    : '📊',
    'Data'        : '📈',
    'AI'          : '🤖',
    'Science'     : '🔬',
    'Language'    : '🌐',
  };
  const icon = icons[category] || '📚';
  const div = document.createElement('div');
  div.className = 'card-image-placeholder';
  div.setAttribute('aria-hidden', 'true');
  div.textContent = icon;
  return div;
}

// ─── Error State ──────────────────────────────────────────
function showError(msg) {
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorMessage.textContent = msg;
}

// ─── Utility ──────────────────────────────────────────────
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
