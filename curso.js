/* ============================================================
   ACADEMY — curso.js
   Detail page: reads ?id=slug from the URL, fetches the CSV,
   finds the matching course and renders it.
   Does NOT modify or depend on script.js internals.
   ============================================================ */

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/1-vmZvDofUCJmafpypyUTJdgr0KLg55b5LUEucVIda5Q/export?format=csv';

// ─── Configuración WhatsApp ───────────────────────────────
// Reemplazá con el número real (código de país sin + ni espacios)
const WHATSAPP_NUMBER = '5491100000000';

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

  // WhatsApp button
  const waMessage = `Hola! Me interesa el curso "${course['Title']}". ¿Me podés contar más?`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`;
  const waBtn = document.getElementById('detail-whatsapp');
  waBtn.href = waUrl;

  // Secciones: Sheet si hay datos, fallback a derivación desde descripción
  const desc = course['Description'] || '';
  renderBullets('detail-learn',    fromSheet(course['Learn'])    || generateLearn(desc, course));
  renderBullets('detail-for',      fromSheet(course['ForWho'])   || generateFor(desc, course));
  renderBullets('detail-outcomes', fromSheet(course['Outcomes']) || generateOutcomes(desc, course));

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

// ─── Secciones derivadas ──────────────────────────────────
// Transformación simple de la descripción existente.
// No usa IA: extrae frases, las reformula como bullets orientados al estudiante.

// ─── Secciones de detalle ─────────────────────────────────

/**
 * Parsea una celda del Sheet separada por ";".
 * Devuelve un array de strings, o null si la celda está vacía/ausente.
 * null activa el fallback al generador desde descripción.
 */
function fromSheet(cellValue) {
  if (!cellValue || !cellValue.trim()) return null;
  const items = cellValue.split(';').map(s => s.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
}

function renderBullets(id, items) {
  const ul = document.getElementById(id);
  items.forEach(text => {
    const li = document.createElement('li');
    li.className = 'detail-bullet';
    li.textContent = text;
    ul.appendChild(li);
  });
}

/**
 * Divide la descripción en oraciones y toma las primeras N como puntos de aprendizaje.
 * Fallback a bullets genéricos basados en categoría/audiencia si la desc es muy corta.
 */
function getSentences(desc) {
  return desc
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);
}

function generateLearn(desc, course) {
  const sentences = getSentences(desc);
  if (sentences.length >= 3) {
    return sentences.slice(0, Math.min(5, sentences.length)).map(capitalizeFirst);
  }
  // Fallback genérico
  const cat = course['Category'] || 'esta área';
  return [
    `Los conceptos fundamentales de ${cat}.`,
    `Las herramientas y metodologías más usadas en la industria.`,
    `Cómo aplicar lo aprendido en proyectos reales.`,
    `Buenas prácticas y estándares actuales del campo.`,
  ];
}

function generateFor(desc, course) {
  const audience = course['Audience'] || '';
  const cat = course['Category'] || 'este campo';
  const base = [
    `Querés dar tus primeros pasos en ${cat}.`,
    `Buscás actualizar tus conocimientos con un enfoque práctico.`,
    `Necesitás una formación estructurada y clara.`,
  ];
  if (audience && audience.toLowerCase() !== 'todos') {
    base.unshift(`Sos ${audience} y querés profundizar tus habilidades.`);
    return base.slice(0, 4);
  }
  return base;
}

function generateOutcomes(desc, course) {
  const sentences = getSentences(desc);
  const cat = course['Category'] || 'tu área';
  if (sentences.length >= 2) {
    // Tomar las últimas oraciones como resultados (suelen ser las más orientadas a logros)
    const last = sentences.slice(-3).map(s => `Aplicar: ${s.toLowerCase()}`).map(capitalizeFirst);
    return last.slice(0, 3);
  }
  return [
    `Resolver problemas concretos de ${cat} con confianza.`,
    `Presentar tu trabajo y resultados de forma profesional.`,
    `Continuar aprendiendo de forma autónoma en esta área.`,
  ];
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
