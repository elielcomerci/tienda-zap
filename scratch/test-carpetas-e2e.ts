/**
 * E2E — Carpetas & Folders (TIERED_UNIT_TABLE v1.0)
 * Ejecutar: npx tsx scratch/test-carpetas-e2e.ts
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

async function main() {
  console.log('='.repeat(70));
  console.log('SUITE E2E: Carpetas & Folders (TIERED_UNIT_TABLE v1.0)');
  console.log('='.repeat(70));

  // 1. Cargar ConfiguratorVersion desde Neon DB
  const configurator = await prisma.configuratorVersion.findFirst({
    where: { product: { slug: 'carpetas-folders' } },
    orderBy: { createdAt: 'desc' },
  });

  if (!configurator) {
    throw new Error('ConfiguratorVersion para "carpetas-folders" no encontrado en DB.');
  }

  console.log(`[DB] Versión: ${configurator.schemaVersion} | Status: ${configurator.status}`);
  if (configurator.status !== 'ACTIVE') {
    fail(`Status esperado ACTIVE, recibido: ${configurator.status}`);
  } else {
    pass('ConfiguratorVersion activo en Neon DB.');
  }

  const payload: any = configurator;

  // Caso 1: 1 unidad, 4/0, sin laminar, solapa blanca -> $1.762 exacto
  console.log('\n--- Caso 1: 1 unidad base (4/0, sin laminar, solapa blanca) ---');
  const sel1 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_0',
    lamination: 'sin_laminar',
    flap: 'blanca',
    quantity: 1,
  };
  const q1 = quoteConfiguratorSelection(payload, sel1);
  if (q1.unitPrice === 1762 && q1.totalPrice === 1762) {
    pass(`Precio exacto de lista: unitario $${q1.unitPrice} | total $${q1.totalPrice}`);
  } else {
    fail(`Se esperaba $1762, obtenido unit=$${q1.unitPrice}, total=$${q1.totalPrice}`);
  }

  // Caso 2: 1 unidad, 4/4, OPP Mate, solapa impresa -> $2.547 + $255 = $2.802
  console.log('\n--- Caso 2: 1 unidad premium (4/4, OPP Mate, solapa impresa) ---');
  const sel2 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_4',
    lamination: 'opp_mate',
    flap: 'impresa',
    quantity: 1,
  };
  const q2 = quoteConfiguratorSelection(payload, sel2);
  if (q2.unitPrice === 2802 && q2.totalPrice === 2802) {
    pass(`Precio exacto: unitario $${q2.unitPrice} ($2.547 base + $255 solapa)`);
  } else {
    fail(`Se esperaba $2802, obtenido: $${q2.totalPrice}`);
  }

  // Caso 3: 20 unidades (rango 2..25), 4/0, Laca UV, solapa blanca -> 20 × $1.519 = $30.380
  console.log('\n--- Caso 3: 20 unidades (rango 2-25u, 4/0, Laca UV) ---');
  const sel3 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_0',
    lamination: 'laca_uv',
    flap: 'blanca',
    quantity: 20,
  };
  const q3 = quoteConfiguratorSelection(payload, sel3);
  if (q3.unitPrice === 1519 && q3.totalPrice === 20 * 1519) {
    pass(`Escala 2-25u correcta: $${q3.unitPrice}/u × 20 = $${q3.totalPrice}`);
  } else {
    fail(`Se esperaba $30380, obtenido: $${q3.totalPrice}`);
  }

  // Caso 4: 37 unidades (rango continuo 26..50), 4/4, OPP Brillo, solapa impresa
  // Base 26..50: $1.864 + solapa $201 = $2.065/u -> 37 × $2.065 = $76.405
  console.log('\n--- Caso 4: 37 unidades arbitrarias (rango 26-50u continuo) ---');
  const sel4 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_4',
    lamination: 'opp_brillo',
    flap: 'impresa',
    quantity: 37,
  };
  const q4 = quoteConfiguratorSelection(payload, sel4);
  const expectedUnit4 = 1864 + 201; // 2065
  const expectedTotal4 = 37 * expectedUnit4; // 76405
  if (q4.unitPrice === expectedUnit4 && q4.totalPrice === expectedTotal4) {
    pass(`Rango continuo 37u: $${q4.unitPrice}/u × 37 = $${q4.totalPrice}`);
  } else {
    fail(`Se esperaba total $${expectedTotal4}, obtenido: $${q4.totalPrice}`);
  }

  // Caso 5: 100 unidades (rango 51..100), 4/0, sin laminar, solapa blanca -> 100 × $1.194 = $119.400
  console.log('\n--- Caso 5: 100 unidades (rango 51-100u, 4/0, sin laminar) ---');
  const sel5 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_0',
    lamination: 'sin_laminar',
    flap: 'blanca',
    quantity: 100,
  };
  const q5 = quoteConfiguratorSelection(payload, sel5);
  if (q5.unitPrice === 1194 && q5.totalPrice === 119400) {
    pass(`Escala 51-100u correcta: $${q5.unitPrice}/u × 100 = $${q5.totalPrice}`);
  } else {
    fail(`Se esperaba $119400, obtenido: $${q5.totalPrice}`);
  }

  // Caso 6: 250 unidades (rango 101..300), 4/4, Laca UV, solapa blanca -> 250 × $1.694 = $423.500
  console.log('\n--- Caso 6: 250 unidades (rango 101-300u, 4/4, Laca UV) ---');
  const sel6 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_4',
    lamination: 'laca_uv',
    flap: 'blanca',
    quantity: 250,
  };
  const q6 = quoteConfiguratorSelection(payload, sel6);
  if (q6.unitPrice === 1694 && q6.totalPrice === 250 * 1694) {
    pass(`Escala 101-300u correcta: $${q6.unitPrice}/u × 250 = $${q6.totalPrice}`);
  } else {
    fail(`Se esperaba $423500, obtenido: $${q6.totalPrice}`);
  }

  // Caso 7: 500 unidades (rango 301..500), 4/4, OPP Mate, solapa impresa
  // Base 301..500: $1.557 + solapa $161 = $1.718/u -> 500 × $1.718 = $859.000
  console.log('\n--- Caso 7: 500 unidades (rango 301-500u, 4/4, OPP Mate, solapa impresa) ---');
  const sel7 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_4',
    lamination: 'opp_mate',
    flap: 'impresa',
    quantity: 500,
  };
  const q7 = quoteConfiguratorSelection(payload, sel7);
  const expectedUnit7 = 1557 + 161; // 1718
  const expectedTotal7 = 500 * expectedUnit7; // 859000
  if (q7.unitPrice === expectedUnit7 && q7.totalPrice === expectedTotal7) {
    pass(`Escala 301-500u con solapa impresa: $${q7.unitPrice}/u × 500 = $${q7.totalPrice}`);
  } else {
    fail(`Se esperaba $${expectedTotal7}, obtenido: $${q7.totalPrice}`);
  }

  // Caso 8: 1000 unidades (rango 501..1000), 4/0, OPP Brillo, solapa blanca -> 1.000 × $1.037 = $1.037.000
  console.log('\n--- Caso 8: 1000 unidades (tope de escala, 4/0, OPP Brillo) ---');
  const sel8 = {
    format: 'a4',
    material: 'ilustracion_300g',
    printing: '4_0',
    lamination: 'opp_brillo',
    flap: 'blanca',
    quantity: 1000,
  };
  const q8 = quoteConfiguratorSelection(payload, sel8);
  if (q8.unitPrice === 1037 && q8.totalPrice === 1037000) {
    pass(`Escala 501-1000u correcta: $${q8.unitPrice}/u × 1000 = $${q8.totalPrice}`);
  } else {
    fail(`Se esperaba $1037000, obtenido: $${q8.totalPrice}`);
  }

  // Caso 9: Semántica de costo: totalCost === 0
  console.log('\n--- Caso 9: Semántica de costo limpio (totalCost === 0) ---');
  if (q1.totalCost === 0 && q4.totalCost === 0 && q8.totalCost === 0) {
    pass('totalCost se mantiene estrictamente en 0 en todas las consultas.');
  } else {
    fail('totalCost no es 0');
  }

  // Caso 10: Desacople de ProductQuoterConfig
  console.log('\n--- Caso 10: Desacople de ProductQuoterConfig ---');
  const qNoQuoter = quoteConfiguratorSelection(payload, sel1, undefined);
  if (qNoQuoter.totalPrice === 1762) {
    pass('quoteConfiguratorSelection opera perfectamente sin quoterConfig');
  } else {
    fail('Fallo al cotizar sin quoterConfig');
  }

  // Caso 11: Validaciones de schema y rechazos de catálogo
  console.log('\n--- Caso 11: Rechazos estrictos de catálogo ---');
  expectError('Rechaza cantidad 0 (< min 1)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: 0 });
  });
  expectError('Rechaza cantidad negativa', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: -5 });
  });
  expectError('Rechaza cantidad decimal (12.5 u)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: 12.5 });
  });
  expectError('Rechaza cantidad superior a escala (1500 u)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: 1500 });
  });
  expectError('Rechaza formato no admitido (oficio)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, format: 'oficio' });
  });
  expectError('Rechaza papel no admitido (obra_80g)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, material: 'obra_80g' });
  });
  expectError('Rechaza impresión no existente (4_1)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, printing: '4_1' });
  });
  expectError('Rechaza terminación no tabulada (soft_touch)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, lamination: 'soft_touch' });
  });
  expectError('Rechaza solapa inválida (sin_solapa)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, flap: 'sin_solapa' });
  });

  console.log('\n' + '='.repeat(70));
  if (exitCode === 0) {
    console.log('✅ TODOS LOS CASOS E2E DE CARPETAS & FOLDERS PASARON EXITOSAMENTE.');
  } else {
    console.error('❌ HUBO FALLAS EN LA SUITE E2E.');
  }
  console.log('='.repeat(70));
}

main()
  .catch((e) => {
    console.error(e);
    exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    process.exit(exitCode);
  });
