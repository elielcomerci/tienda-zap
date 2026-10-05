/**
 * E2E — Adhesivos & Stickers (STICKER_TABLE v1.0)
 * Ejecutar: npx tsx scratch/test-stickers-e2e.ts
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
  console.log('SUITE E2E: Adhesivos & Stickers (STICKER_TABLE v1.0)');
  console.log('='.repeat(70));

  // 1. Cargar ConfiguratorVersion desde Neon DB
  const configurator = await prisma.configuratorVersion.findFirst({
    where: { product: { slug: 'adhesivos-stickers' } },
    orderBy: { createdAt: 'desc' },
  });

  if (!configurator) {
    throw new Error('ConfiguratorVersion para "adhesivos-stickers" no encontrado en DB.');
  }

  console.log(`[DB] Versión: ${configurator.schemaVersion} | Status: ${configurator.status}`);
  if (configurator.status !== 'ACTIVE') {
    fail(`Status esperado ACTIVE, recibido: ${configurator.status}`);
  } else {
    pass('ConfiguratorVersion activo en Neon DB.');
  }

  const payload: any = configurator;

  // Caso 1: 3x3 cm, 500u, sin laca, circular -> $8.870 exacto
  console.log('\n--- Caso 1: 3x3 cm, 500u, sin laca, circular ($8.870) ---');
  const sel1 = {
    material: 'papel_autoadhesivo_90g',
    format: '3x3',
    shape: 'circular',
    lamination: 'sin_laca',
    quantity: 500,
  };
  const q1 = quoteConfiguratorSelection(payload, sel1);
  if (q1.totalPrice === 8870 && q1.unitPrice === 8870 / 500) {
    pass(`Precio exacto de lista: $${q1.totalPrice} ($${q1.unitPrice}/u)`);
  } else {
    fail(`Se esperaba $8870, obtenido: $${q1.totalPrice}`);
  }

  // Caso 2: 3x3 cm, 500u, sin laca, cuadrado -> $8.870 (forma no altera precio)
  console.log('\n--- Caso 2: 3x3 cm, 500u, sin laca, cuadrado ($8.870) ---');
  const sel2 = {
    material: 'papel_autoadhesivo_90g',
    format: '3x3',
    shape: 'cuadrado',
    lamination: 'sin_laca',
    quantity: 500,
  };
  const q2 = quoteConfiguratorSelection(payload, sel2);
  if (q2.totalPrice === 8870) {
    pass(`Forma cuadrada tiene idéntico precio: $${q2.totalPrice}`);
  } else {
    fail(`Se esperaba $8870, obtenido: $${q2.totalPrice}`);
  }
  const shapeOpt = q2.selectedOptions.find((o) => o.name === 'Forma de corte');
  if (shapeOpt?.value === 'Cuadrado / Rectangular') {
    pass(`Opción registrada correctamente en selectedOptions: "${shapeOpt.value}"`);
  } else {
    fail(`Opción de forma no registrada como esperado: ${JSON.stringify(shapeOpt)}`);
  }

  // Caso 3: 5x5 cm, 500u, sin laca, circular -> $19.231
  console.log('\n--- Caso 3: 5x5 cm, 500u, sin laca ($19.231) ---');
  const sel3 = {
    material: 'papel_autoadhesivo_90g',
    format: '5x5',
    shape: 'circular',
    lamination: 'sin_laca',
    quantity: 500,
  };
  const q3 = quoteConfiguratorSelection(payload, sel3);
  if (q3.totalPrice === 19231) {
    pass(`Precio exacto de lista: $${q3.totalPrice}`);
  } else {
    fail(`Se esperaba $19231, obtenido: $${q3.totalPrice}`);
  }

  // Caso 4: 5x5 cm, 500u, con Laca UV Brillo (+15%) -> $19.231 * 1.15 = $22.116
  console.log('\n--- Caso 4: 5x5 cm, 500u, con Laca UV (+15%) ($22.116) ---');
  const sel4 = {
    material: 'papel_autoadhesivo_90g',
    format: '5x5',
    shape: 'circular',
    lamination: 'laca_uv_brillo',
    quantity: 500,
  };
  const q4 = quoteConfiguratorSelection(payload, sel4);
  const recargo4 = Math.round(19231 * 0.15);
  const expected4 = 19231 + recargo4; // 22116
  if (q4.totalPrice === expected4) {
    pass(`Precio con +15% de Laca UV exacto: $${q4.totalPrice} (base $19.231 + recargo $${recargo4})`);
  } else {
    fail(`Se esperaba $${expected4}, obtenido: $${q4.totalPrice}`);
  }

  // Caso 5: 10x10 cm, 1000u, sin laca -> $110.654
  console.log('\n--- Caso 5: 10x10 cm, 1000u, sin laca ($110.654) ---');
  const sel5 = {
    material: 'papel_autoadhesivo_90g',
    format: '10x10',
    shape: 'circular',
    lamination: 'sin_laca',
    quantity: 1000,
  };
  const q5 = quoteConfiguratorSelection(payload, sel5);
  if (q5.totalPrice === 110654) {
    pass(`Precio exacto de lista: $${q5.totalPrice}`);
  } else {
    fail(`Se esperaba $110654, obtenido: $${q5.totalPrice}`);
  }

  // Caso 6: 10x10 cm, 1000u, con Laca UV (+15%) -> $110.654 + 16.598 = $127.252
  console.log('\n--- Caso 6: 10x10 cm, 1000u, con Laca UV (+15%) ($127.252) ---');
  const sel6 = {
    material: 'papel_autoadhesivo_90g',
    format: '10x10',
    shape: 'circular',
    lamination: 'laca_uv_brillo',
    quantity: 1000,
  };
  const q6 = quoteConfiguratorSelection(payload, sel6);
  const recargo6 = Math.round(110654 * 0.15);
  const expected6 = 110654 + recargo6; // 127252
  if (q6.totalPrice === expected6) {
    pass(`Precio con +15% de Laca UV exacto: $${q6.totalPrice} (base $110.654 + recargo $${recargo6})`);
  } else {
    fail(`Se esperaba $${expected6}, obtenido: $${q6.totalPrice}`);
  }

  // Caso 7: Curva completa de cantidades para 4x4 cm (100, 200, 300, 500, 1000)
  console.log('\n--- Caso 7: Escala de tiradas para 4x4 cm (100u a 1000u) ---');
  const tiers4x4: Record<number, number> = {
    100: 4726,
    200: 4968,
    300: 8281,
    500: 13249,
    1000: 24039,
  };
  for (const [qtyStr, expPrice] of Object.entries(tiers4x4)) {
    const qty = Number(qtyStr);
    const q = quoteConfiguratorSelection(payload, {
      material: 'papel_autoadhesivo_90g',
      format: '4x4',
      shape: 'circular',
      lamination: 'sin_laca',
      quantity: qty,
    });
    if (q.totalPrice === expPrice) {
      pass(`4x4 cm @ ${qty}u → $${q.totalPrice} ($${(q.unitPrice).toFixed(2)}/u)`);
    } else {
      fail(`4x4 cm @ ${qty}u: se esperaba $${expPrice}, obtenido $${q.totalPrice}`);
    }
  }

  // Caso 8: Verificación semántica de costo: totalCost === 0 (no finge costos internos)
  console.log('\n--- Caso 8: Semántica de costo (totalCost === 0) ---');
  if (q1.totalCost === 0 && q3.totalCost === 0) {
    pass('totalCost se mantiene en 0 (precio de lista oficial sin contaminar costos internos)');
  } else {
    fail(`totalCost no es 0: q1=${q1.totalCost}, q3=${q3.totalCost}`);
  }

  // Caso 9: Desacople total de ProductQuoterConfig
  console.log('\n--- Caso 9: Desacople de ProductQuoterConfig ---');
  const qNoQuoter = quoteConfiguratorSelection(payload, sel1, undefined);
  if (qNoQuoter.totalPrice === 8870) {
    pass('quoteConfiguratorSelection funciona perfectamente con quoterConfig = undefined');
  } else {
    fail('Fallo al cotizar sin quoterConfig');
  }

  // Caso 10: Validación estricta y rechazos UI/Schema
  console.log('\n--- Caso 10: Rechazos de combinaciones inválidas ---');
  expectError('Rechaza formato no permitido en v1 (2x2 cm)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, format: '2x2' });
  });
  expectError('Rechaza formato no permitido (15x15 cm)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, format: '15x15' });
  });
  expectError('Rechaza cantidad no permitida (50 u)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: 50 });
  });
  expectError('Rechaza cantidad no permitida (2000 u)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, quantity: 2000 });
  });
  expectError('Rechaza material no admitido en v1 (opp_blanco)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, material: 'opp_blanco' });
  });
  expectError('Rechaza terminación inexistente (laca_sectorizada)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, lamination: 'laca_sectorizada' });
  });
  expectError('Rechaza omisión de campo requerido (material)', () => {
    quoteConfiguratorSelection(payload, { ...sel1, material: undefined });
  });

  console.log('\n' + '='.repeat(70));
  if (exitCode === 0) {
    console.log('✅ TODOS LOS CASOS E2E DE ADHESIVOS & STICKERS PASARON EXITOSAMENTE.');
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
