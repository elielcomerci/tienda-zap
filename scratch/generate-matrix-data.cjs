const fs = require('fs');
const path = require('path');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Special canonical slug overrides for products if needed
const PRODUCT_SLUG_MAP = {
  'Tarjetas & Vouchers': 'tarjetas-vouchers',
  'Flyers & Desplegables': 'flyers-desplegables',
  'Tags & Etiquetas': 'tags-etiquetas',
  'Adhesivos & Stickers': 'adhesivos-stickers',
  'Fajas & Envoltorios': 'fajas-envoltorios',
  'Bolsas & Contenedores': 'bolsas-contenedores',
  'Cajas Personalizadas': 'cajas-personalizadas',
  'Carpetas & Folders': 'carpetas-folders',
  'Menús & Cartas': 'menus-cartas',
  'Individuales & Posavasos': 'individuales-posavasos',
  'Cartelería & Ploteo': 'carteleria-ploteo',
  'Corpóreos & Marquesinas': 'corporeos-marquesinas',
  'Señalética & Placas': 'senaletica-placas',
  'Expositores & Stands': 'expositores-stands',
  'Indumentaria & Textil': 'indumentaria-textil',
  'Objetos & Regalería': 'objetos-regaleria',
  'Activos Web & Sitios': 'activos-web-sitios',
  'Asistentes & Bots': 'asistentes-bots',
  'Anuncios & Campañas': 'anuncios-campanas',
  'Producción Audiovisual': 'produccion-audiovisual',
  'Sistema de Identidad': 'sistema-identidad',
  'Operaciones & Consultoría': 'operaciones-consultoria',
};

const RUBRO_SLUG_MAP = {
  'Gastronomía': 'gastronomia',
  'Moda & Showrooms': 'moda-showrooms',
  'Inmobiliarias': 'inmobiliarias',
  'Belleza & Salud': 'belleza-salud',
  'Comercios & Retail': 'comercios-retail',
  'Eventos & Experiencias': 'eventos-experiencias',
  'Wellness': 'wellness',
};

const content = fs.readFileSync(path.join(__dirname, '../matrizdeproductos.md'), 'utf-8');
const lines = content.split('\n');

let insideRubros = false;
let currentRubro = '';
let currentSituation = '';
let currentNeed = '';

const rubrosOrder = [];
const situationsMap = new Map(); // slug -> { slug, name, order }
const needsMap = new Map(); // slug -> { slug, name, order }
const tuples = [];

let sitOrder = 0;
let needOrder = 0;

for (const rawLine of lines) {
  const line = rawLine.trim();
  if (line.match(/^# 0[1-7]\./)) {
    insideRubros = true;
    currentRubro = line.replace(/^# \d+\.\s*/, '').trim();
    if (!rubrosOrder.includes(currentRubro)) {
      rubrosOrder.push(currentRubro);
    }
  } else if (line.startsWith('# ') && !line.match(/^# 0[1-7]\./)) {
    insideRubros = false;
  } else if (insideRubros && line.startsWith('## Situación:')) {
    currentSituation = line.replace(/^## Situación:\s*/, '').trim();
    const sSlug = slugify(currentSituation);
    if (!situationsMap.has(sSlug)) {
      sitOrder += 10;
      situationsMap.set(sSlug, { slug: sSlug, name: currentSituation, order: sitOrder });
    }
  } else if (insideRubros && line.startsWith('### ')) {
    currentNeed = line.replace(/^###\s*/, '').trim();
    const nSlug = slugify(currentNeed);
    if (!needsMap.has(nSlug)) {
      needOrder += 10;
      needsMap.set(nSlug, { slug: nSlug, name: currentNeed, order: needOrder });
    }
  } else if (insideRubros && line.startsWith('* ')) {
    const product = line.replace(/^\*\s*/, '').trim();
    if (product && currentRubro && currentSituation && currentNeed) {
      const bSlug = RUBRO_SLUG_MAP[currentRubro] || slugify(currentRubro);
      const sSlug = slugify(currentSituation);
      const nSlug = slugify(currentNeed);
      const pSlug = PRODUCT_SLUG_MAP[product] || slugify(product);

      tuples.push({
        businessTypeSlug: bSlug,
        situationSlug: sSlug,
        needSlug: nSlug,
        productSlug: pSlug,
      });
    }
  }
}

console.log(`Parsed:
- ${rubrosOrder.length} Rubros
- ${situationsMap.size} Unique Situations
- ${needsMap.size} Unique Needs
- ${tuples.length} OfferMatrix tuples`);

// Export JSON for generation
fs.writeFileSync(
  path.join(__dirname, 'parsed-matrix.json'),
  JSON.stringify({
    rubros: rubrosOrder.map((name, i) => ({ slug: RUBRO_SLUG_MAP[name], name, order: (i + 1) * 10 })),
    situations: Array.from(situationsMap.values()),
    needs: Array.from(needsMap.values()),
    tuples,
  }, null, 2)
);
console.log('Saved scratch/parsed-matrix.json');
