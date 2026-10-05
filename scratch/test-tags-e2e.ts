/**
 * E2E — Tags & Etiquetas (10 casos del contrato v1.0)
 * Ejecutar: npx tsx scratch/test-tags-e2e.ts
 */

import fs from 'fs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { quoteConfiguratorSelection } from '../src/lib/pricing/configurator-adapter';

// ─── Cargar .env.local ────────────────────────────────────────────────────────
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Helpers ──────────────────────────────────────────────────────────────────

let exitCode = 0;

function pass(label: string) {
  console.log(`  ✅ ${label}`);
}

function fail(label: string, err?: any) {
  console.error(`  ❌ ${label}`);
  console.error(`     ${err?.message || err}`);
  exitCode = 1;
}

function expectError(label: string, fn: () => void) {
  try {
    fn();
    fail(label, new Error('Se esperaba un error pero la función terminó sin lanzar.'));
  } catch (e: any) {
    pass(`${label} → "${e.message}"`);
  }
}

// ─── Cargar desde BD ──────────────────────────────────────────────────────────

async function loadConfigurator(productSlug: string) {
  const cv = await prisma.configuratorVersion.findFirst({
    where: { product: { slug: productSlug } },
    orderBy: { createdAt: 'desc' },
  });
  if (!cv) throw new Error(`No se encontró ConfiguratorVersion para "${productSlug}".`);
  return cv;
}

async function loadQuoterConfig(productSlug: string) {
  const qc = await prisma.productQuoterConfig.findFirst({
    where: { product: { slug: productSlug } },
    include: {
      allowedMaterials: { include: { rawMaterial: { include: { tiers: true } } } },
      finishings: { include: { finishing: { include: { tiers: true } } } },
      sizePresets: true,
      quantityPresets: true,
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
  const quoterConfig = await loadQuoterConfig('tags-etiquetas');

  console.log(`  Configurador: ${configurator.productSlug} v${configurator.schemaVersion} [${configurator.status}]`);
  console.log(`  RawMaterials: ${quoterConfig.allowedMaterials.length}`);
  console.log(`  Finishings:   ${quoterConfig.finishings.length} → ${quoterConfig.finishings.map((f: any) => f.finishing.id).join(', ')}`);
  console.log(`  SizePresets:  ${quoterConfig.sizePresets.map((s: any) => s.label).join(', ')}`);
  console.log(`  Quantities:   ${quoterConfig.quantityPresets.map((q: any) => q.quantity).join(', ')}`);
  console.log('');

  const BASE = { material: 'ilustracion_350g', printing: '4_0', lamination: 'sin_laminar', additionalFinishings: [] };

  // ── Caso 1: 9×5 · 4/0 · sin laminar · 500 ───────────────────────────────
  console.log('CASO 1 — 9×5 · 350g · 4/0 · sin laminar · 500:');
  try {
    const r = quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', quantity: 500 }, quoterConfig as any);
    pass(`Total: $${r.totalPrice.toLocaleString('es-AR')} | Unitario: $${r.unitPrice.toFixed(2)}`);
    pass(`Terminaciones: ${r.selectedOptions.find(o => o.name === 'Terminaciones')?.value}`);
  } catch (e: any) { fail('Caso 1', e); }

  // ── Caso 2: 9×5 · 4/4 · brillo · 1.000 ─────────────────────────────────
  console.log('\nCASO 2 — 9×5 · 350g · 4/4 · OPP Brillo · 1.000:');
  try {
    const r = quoteConfiguratorSelection(configurator as any,
      { format: '9x5', material: 'ilustracion_350g', printing: '4_4', lamination: 'opp_brillo_frente', additionalFinishings: [], quantity: 1000 },
      quoterConfig as any
    );
    pass(`Total: $${r.totalPrice.toLocaleString('es-AR')} | Unitario: $${r.unitPrice.toFixed(2)}`);
  } catch (e: any) { fail('Caso 2', e); }

  // ── Caso 3: 5×18 · 4/4 · brillo · 2.000 ────────────────────────────────
  console.log('\nCASO 3 — 5×18 · 350g · 4/4 · OPP Brillo · 2.000:');
  try {
    const r = quoteConfiguratorSelection(configurator as any,
      { format: '5x18', material: 'ilustracion_350g', printing: '4_4', lamination: 'opp_brillo_frente', additionalFinishings: [], quantity: 2000 },
      quoterConfig as any
    );
    pass(`Total: $${r.totalPrice.toLocaleString('es-AR')} | Unitario: $${r.unitPrice.toFixed(2)}`);
  } catch (e: any) { fail('Caso 3', e); }

  // ── Caso 4: 9×10 · 4/0 · sin laminar · 3.000 + puntas ──────────────────
  console.log('\nCASO 4 — 9×10 · 350g · 4/0 · sin laminar · 3.000 + puntas:');
  try {
    const r = quoteConfiguratorSelection(configurator as any,
      { format: '9x10', material: 'ilustracion_350g', printing: '4_0', lamination: 'sin_laminar', additionalFinishings: ['puntas_redondeadas'], quantity: 3000 },
      quoterConfig as any
    );
    pass(`Total: $${r.totalPrice.toLocaleString('es-AR')} | Unitario: $${r.unitPrice.toFixed(2)}`);
    const terms = r.selectedOptions.find(o => o.name === 'Terminaciones')?.value || '';
    if (terms.toLowerCase().includes('punta')) pass(`Puntas en output: "${terms}"`);
    else fail('Puntas redondeadas no aparecen en terminaciones', new Error(terms));
  } catch (e: any) { fail('Caso 4', e); }

  // ── Rechazos ─────────────────────────────────────────────────────────────

  console.log('\nCASO 5 — RECHAZO formato 9x15:');
  expectError('9x15 → error de validación', () =>
    quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x15', quantity: 500 }, quoterConfig as any)
  );

  console.log('\nCASO 6 — RECHAZO material ilustracion_300g:');
  expectError('300g → error de resolución', () =>
    quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', material: 'ilustracion_300g', quantity: 500 }, quoterConfig as any)
  );

  console.log('\nCASO 7 — RECHAZO laminado opp_mate:');
  expectError('opp_mate → error de validación', () =>
    quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', lamination: 'opp_mate', quantity: 500 }, quoterConfig as any)
  );

  console.log('\nCASO 8 — RECHAZO impresión 4_1:');
  expectError('4_1 → error de validación', () =>
    quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', printing: '4_1', quantity: 500 }, quoterConfig as any)
  );

  console.log('\nCASO 9 — RECHAZO cantidad 100:');
  expectError('qty=100 → no en quantityPresets', () =>
    quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', quantity: 100 }, quoterConfig as any)
  );

  // ── Caso 10: perforación siempre presente ────────────────────────────────
  console.log('\nCASO 10 — fin_perforacion siempre incluido:');
  try {
    const hasPerforacion = quoterConfig.finishings.some((f: any) => f.finishing.id === 'fin_perforacion');
    if (!hasPerforacion) throw new Error('fin_perforacion no está en quoterConfig.finishings.');
    pass('fin_perforacion asignado al quoterConfig');

    const adapterData = (configurator as any).pricing?.adapter;
    if (!adapterData?.processResolution?.PERFORACION)
      throw new Error('PERFORACION no mapeada en processResolution.');
    pass(`processResolution.PERFORACION → "${adapterData.processResolution.PERFORACION}"`);

    const r = quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', quantity: 500 }, quoterConfig as any);
    const terms = r.selectedOptions.find(o => o.name === 'Terminaciones')?.value || '';
    if (terms.toLowerCase().includes('perfor')) pass(`Perforación en output: "${terms}"`);
    else fail('fin_perforacion ausente en output de terminaciones', new Error(`Output: "${terms}"`));
  } catch (e: any) { fail('Caso 10', e); }

  // ── Comparación escala de perforación ────────────────────────────────────
  console.log('\n── Escala de precios por cantidad (deuda técnica: perf tier) ───');
  console.log('  qty     total         unit     perf-cotizador  perf-catálogo');
  const perfTierUnit = 2.5; // tier 501+ del fin_perforacion actual
  const catPerf: Record<number, number> = { 500: 3225, 1000: 4500, 2000: 4500 + 3556, 3000: 4500 + 3556 * 2 };
  for (const qty of [500, 1000, 2000, 3000]) {
    try {
      const r = quoteConfiguratorSelection(configurator as any, { ...BASE, format: '9x5', quantity: qty }, quoterConfig as any);
      const perfCotiz = (qty * perfTierUnit).toFixed(0);
      const perfCat   = catPerf[qty]?.toLocaleString('es-AR') ?? '?';
      console.log(`  ${String(qty).padEnd(6)}  $${String(r.totalPrice).padStart(10)}  $${r.unitPrice.toFixed(2).padStart(6)}  $${perfCotiz.padStart(9)}  $${perfCat.padStart(9)}`);
    } catch (e: any) {
      console.log(`  qty=${qty}: ERROR → ${e.message}`);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  if (exitCode === 1) console.log(' ❌  Algunos casos fallaron.');
  else                console.log(' ✅  Todos los casos pasaron.');
  console.log('══════════════════════════════════════════════════\n');

  process.exit(exitCode);
}

main()
  .catch((e) => { console.error('Error fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
