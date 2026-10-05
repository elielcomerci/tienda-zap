/**
 * E2E — Tags & Etiquetas (10 casos definidos en el contrato v1.0)
 *
 * Ejecutar con:  node scratch/test-tags-e2e.mjs
 *
 * Requisitos:
 *  - Seed ejecutado con tags-etiquetas en BD (DRAFT o ACTIVE, indistinto para el test).
 *  - Variables de entorno: DATABASE_URL (Neon).
 */

import { PrismaClient } from '@prisma/client';
import { quoteConfiguratorSelection } from '../src/lib/pricing/configurator-adapter.js';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(label) {
  console.log(`  ✅ ${label}`);
}

function fail(label, err) {
  console.error(`  ❌ ${label}`);
  console.error(`     ${err?.message || err}`);
  process.exitCode = 1;
}

function expectError(label, fn) {
  try {
    fn();
    fail(label, new Error('Se esperaba un error pero la función terminó sin lanzar.'));
  } catch (e) {
    pass(`${label} → "${e.message}"`);
  }
}

// ─── Cargar configurador y quoterConfig desde BD ──────────────────────────────

async function loadConfigurator(productSlug) {
  const cv = await prisma.configuratorVersion.findFirst({
    where: { product: { slug: productSlug } },
    orderBy: { createdAt: 'desc' },
  });
  if (!cv) throw new Error(`No se encontró ConfiguratorVersion para "${productSlug}".`);
  return cv;
}

async function loadQuoterConfig(productSlug) {
  const qc = await prisma.productQuoterConfig.findUnique({
    where: { productSlug },
    include: {
      allowedMaterials: { include: { rawMaterial: { include: { tiers: true } } } },
      finishings:       { include: { finishing: { include: { tiers: true } } } },
      sizePresets:      true,
      quantityPresets:  true,
    },
  });
  if (!qc) throw new Error(`No se encontró ProductQuoterConfig para "${productSlug}".`);
  return qc;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log(' E2E: Tags & Etiquetas — 10 casos contractuales   ');
  console.log('══════════════════════════════════════════════════\n');

  const configurator = await loadConfigurator('tags-etiquetas');
  const quoterConfig  = await loadQuoterConfig('tags-etiquetas');

  console.log(`  Configurador: ${configurator.productSlug} v${configurator.schemaVersion} [${configurator.status}]`);
  console.log(`  RawMaterials: ${quoterConfig.allowedMaterials.length}`);
  console.log(`  Finishings:   ${quoterConfig.finishings.length}`);
  console.log(`  SizePresets:  ${quoterConfig.sizePresets.map(s => s.label).join(', ')}`);
  console.log(`  Quantities:   ${quoterConfig.quantityPresets.map(q => q.quantity).join(', ')}`);
  console.log('');

  // ── Caso 1: 9×5 · 350g · 4/0 · sin laminar · 500 ──────────────────────────
  console.log('CASO 1 — 9×5 · 350g · 4/0 · sin laminar · 500:');
  try {
    const result = quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 500,
    }, quoterConfig);
    pass(`Precio total: $${result.totalPrice.toLocaleString()} | Unitario: $${result.unitPrice.toFixed(2)}`);
    pass(`Terminaciones: ${result.selectedOptions.find(o => o.name === 'Terminaciones')?.value}`);
  } catch (e) { fail('Caso 1', e); }

  // ── Caso 2: 9×5 · 350g · 4/4 · brillo · 1.000 ─────────────────────────────
  console.log('\nCASO 2 — 9×5 · 350g · 4/4 · brillo · 1.000:');
  try {
    const result = quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_4',
      lamination: 'opp_brillo_frente', additionalFinishings: [], quantity: 1000,
    }, quoterConfig);
    pass(`Precio total: $${result.totalPrice.toLocaleString()} | Unitario: $${result.unitPrice.toFixed(2)}`);
  } catch (e) { fail('Caso 2', e); }

  // ── Caso 3: 5×18 · 350g · 4/4 · brillo · 2.000 ────────────────────────────
  console.log('\nCASO 3 — 5×18 · 350g · 4/4 · brillo · 2.000:');
  try {
    const result = quoteConfiguratorSelection(configurator, {
      format: '5x18', material: 'ilustracion_350g', printing: '4_4',
      lamination: 'opp_brillo_frente', additionalFinishings: [], quantity: 2000,
    }, quoterConfig);
    pass(`Precio total: $${result.totalPrice.toLocaleString()} | Unitario: $${result.unitPrice.toFixed(2)}`);
  } catch (e) { fail('Caso 3', e); }

  // ── Caso 4: 9×10 · 350g · 4/0 · sin laminar · 3.000 + puntas ──────────────
  console.log('\nCASO 4 — 9×10 · 350g · 4/0 · sin laminar · 3.000 + puntas:');
  try {
    const result = quoteConfiguratorSelection(configurator, {
      format: '9x10', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: ['puntas_redondeadas'], quantity: 3000,
    }, quoterConfig);
    pass(`Precio total: $${result.totalPrice.toLocaleString()} | Unitario: $${result.unitPrice.toFixed(2)}`);
    const terms = result.selectedOptions.find(o => o.name === 'Terminaciones')?.value || '';
    if (!terms.includes('Puntas') && !terms.includes('puntas')) {
      fail('Puntas redondeadas no aparecen en terminaciones', new Error(terms));
    } else {
      pass(`Terminaciones incluyen puntas: ${terms}`);
    }
  } catch (e) { fail('Caso 4', e); }

  // ── Casos de RECHAZO (5–10) ────────────────────────────────────────────────

  // Caso 5: rechazo de formato 9x15 (no existe en el schema)
  console.log('\nCASO 5 — RECHAZO formato 9x15 (no en schema):');
  expectError('9x15 → error de validación', () =>
    quoteConfiguratorSelection(configurator, {
      format: '9x15', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 500,
    }, quoterConfig)
  );

  // Caso 6: rechazo de material 300g (no en materialResolution)
  console.log('\nCASO 6 — RECHAZO material ilustracion_300g:');
  expectError('300g → error de resolución', () =>
    quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_300g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 500,
    }, quoterConfig)
  );

  // Caso 7: rechazo de laminado opp_mate (no en schema)
  console.log('\nCASO 7 — RECHAZO laminado opp_mate:');
  expectError('opp_mate → error de validación', () =>
    quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'opp_mate', additionalFinishings: [], quantity: 500,
    }, quoterConfig)
  );

  // Caso 8: rechazo de impresión 4_1 (no en schema)
  console.log('\nCASO 8 — RECHAZO impresión 4_1:');
  expectError('4_1 → error de validación', () =>
    quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_1',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 500,
    }, quoterConfig)
  );

  // Caso 9: rechazo de cantidad no soportada (100)
  console.log('\nCASO 9 — RECHAZO cantidad 100:');
  expectError('qty=100 → error de validación', () =>
    quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 100,
    }, quoterConfig)
  );

  // Caso 10: verificar que fin_perforacion siempre está en la resolución
  console.log('\nCASO 10 — fin_perforacion siempre incluido (proceso obligatorio):');
  try {
    // Chequeamos que el quoterConfig tiene fin_perforacion
    const hasPerforacion = quoterConfig.finishings.some(f => f.finishing.id === 'fin_perforacion');
    if (!hasPerforacion) throw new Error('fin_perforacion no está asignado al quoterConfig de tags-etiquetas.');
    pass('fin_perforacion presente en quoterConfig');

    // Chequeamos que el adapter lo agrega vía processResolution
    const adapterData = configurator.pricing?.adapter;
    if (!adapterData?.processResolution?.PERFORACION) {
      throw new Error('PERFORACION no mapeada en pricing.adapter.processResolution.');
    }
    pass(`PERFORACION → ${adapterData.processResolution.PERFORACION}`);

    // Cotizamos y verificamos que aparece en terminaciones
    const result = quoteConfiguratorSelection(configurator, {
      format: '9x5', material: 'ilustracion_350g', printing: '4_0',
      lamination: 'sin_laminar', additionalFinishings: [], quantity: 500,
    }, quoterConfig);
    const terms = result.selectedOptions.find(o => o.name === 'Terminaciones')?.value || '';
    if (!terms.toLowerCase().includes('perfor')) {
      fail('fin_perforacion no aparece en el output de terminaciones', new Error(`Output: "${terms}"`));
    } else {
      pass(`Perforación confirmada en output: "${terms}"`);
    }
  } catch (e) { fail('Caso 10', e); }

  // ── Comparación de precios por escala de perforación ─────────────────────
  console.log('\n── Comparación escala perforación (deuda técnica) ──────────────');
  const baseSelection = { format: '9x5', material: 'ilustracion_350g', printing: '4_0', lamination: 'sin_laminar', additionalFinishings: [] };
  for (const qty of [500, 1000, 2000, 3000]) {
    try {
      const r = quoteConfiguratorSelection(configurator, { ...baseSelection, quantity: qty }, quoterConfig);
      // Perforación PER_UNIT al tier 501+ = $2.5/u
      const perfCost = qty * 2.5;
      console.log(`  qty=${qty}: total=$${r.totalPrice.toLocaleString().padStart(9)} | perf-approx=$${perfCost.toFixed(0)}`);
    } catch (e) {
      console.log(`  qty=${qty}: ERROR → ${e.message}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  if (process.exitCode === 1) {
    console.log(' ❌  Algunos casos fallaron.');
  } else {
    console.log(' ✅  Todos los casos pasaron.');
  }
  console.log('══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('Error fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
