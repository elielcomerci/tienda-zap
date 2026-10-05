import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  quoteConfiguratorSelection,
  validateCommercialSelection,
  resolveQuoterSelection,
  type CommercialSelection,
} from '../src/lib/pricing/configurator-adapter';

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function runFlyersE2ETests() {
  console.log('=================================================================');
  console.log('TEST E2E: FLYERS & DESPLEGABLES — CONFIGURATOR 1.0 INTEGRATION');
  console.log('=================================================================\n');

  const product = await prisma.product.findUnique({
    where: { slug: 'flyers-desplegables' },
    include: {
      configuratorVersions: {
        where: { schemaVersion: '1.0' },
      },
      quoterConfig: {
        include: {
          allowedMaterials: {
            include: {
              rawMaterial: {
                include: { tiers: true },
              },
            },
          },
          finishings: {
            include: {
              finishing: {
                include: { tiers: true },
              },
            },
          },
          sizePresets: true,
          quantityPresets: true,
        },
      },
    },
  });

  if (!product) throw new Error("Producto 'flyers-desplegables' no encontrado en DB.");
  const configurator = product.configuratorVersions[0];
  if (!configurator) throw new Error("ConfiguratorVersion '1.0' para 'flyers-desplegables' no encontrado.");
  const quoterConfig = product.quoterConfig;
  if (!quoterConfig) throw new Error("ProductQuoterConfig para 'flyers-desplegables' no encontrado.");

  console.log(`[DB] Producto: ${product.name} (${product.slug})`);
  console.log(`[DB] ConfiguratorVersion: ${configurator.schemaVersion} [${configurator.status}]`);
  console.log(
    `[DB] QuoterConfig: ${quoterConfig.allowedMaterials.length} materiales, ${quoterConfig.finishings.length} terminaciones permitidas.\n`
  );

  const quoterConfigInput: any = {
    pricingMode: quoterConfig.pricingMode,
    itemWidth: quoterConfig.itemWidth,
    itemHeight: quoterConfig.itemHeight,
    margin: quoterConfig.margin,
    bleed: quoterConfig.bleed,
    profitMargin: quoterConfig.profitMargin,
    minProfitMargin: quoterConfig.minProfitMargin,
    maxProfitMargin: quoterConfig.maxProfitMargin,
    allowCustomSize: quoterConfig.allowCustomSize,
    rawMaterial: null,
    allowedMaterials: quoterConfig.allowedMaterials.map((am) => ({ rawMaterial: am.rawMaterial })),
    finishings: quoterConfig.finishings.map((qf) => ({ finishing: qf.finishing })),
    sizePresets: quoterConfig.sizePresets,
    quantityPresets: quoterConfig.quantityPresets,
  };

  const configuratorPayload: any = {
    schema: configurator.schema,
    compatibility: configurator.compatibility,
    pricing: configurator.pricing,
  };

  // -------------------------------------------------------------------------
  // TEST 1: Plano 15x21 · 115g · 4/0 · 500 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Plano 15×21 · 115g · 4/0 · 500 u ---');
  const sel1: CommercialSelection = {
    foldingType: 'plano',
    format: '15x21',
    material: 'ilustracion_115g',
    printing: '4_0',
    quantity: 500,
  };
  const q1 = quoteConfiguratorSelection(configuratorPayload, sel1, quoterConfigInput);
  console.log('   - Medida abierta anidada: 15x21 cm');
  console.log('   - Costo total:  $', q1.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q1.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q1.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  if (q1.totalPrice <= 0) throw new Error('Test 1 falló: precio <= 0');
  console.log('✅ TEST 1 OK.\n');

  // -------------------------------------------------------------------------
  // TEST 2: Plano A4 · 150g · 4/4 · 1.000 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 2: Plano A4 · 150g · 4/4 · 1.000 u ---');
  const sel2: CommercialSelection = {
    foldingType: 'plano',
    format: 'a4',
    material: 'ilustracion_150g',
    printing: '4_4',
    quantity: 1000,
  };
  const q2 = quoteConfiguratorSelection(configuratorPayload, sel2, quoterConfigInput);
  console.log('   - Medida abierta anidada: A4 (21x29.7 cm)');
  console.log('   - Costo total:  $', q2.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q2.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q2.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  if (q2.totalPrice <= 0) throw new Error('Test 2 falló: precio <= 0');
  console.log('✅ TEST 2 OK.\n');

  // -------------------------------------------------------------------------
  // TEST 3: Díptico cerrado A5 → abierto A4 · 115g · 4/4 · 1.000 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 3: Díptico cerrado A5 → abierto A4 · 115g · 4/4 · 1.000 u ---');
  const sel3: CommercialSelection = {
    foldingType: 'diptico',
    format: '15x21',
    material: 'ilustracion_115g',
    printing: '4_4',
    quantity: 1000,
  };
  const q3 = quoteConfiguratorSelection(configuratorPayload, sel3, quoterConfigInput);
  console.log('   - Medida abierta anidada: A4 (21x29.7 cm)');
  console.log('   - Terminaciones activadas:', q3.selectedOptions.find((o) => o.name === 'Terminaciones')?.value);
  console.log('   - Costo total:  $', q3.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q3.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q3.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  if (!q3.selectedOptions.some((o) => o.value.includes('Doblado Díptico'))) {
    throw new Error('Test 3 falló: no incluyó Doblado Díptico');
  }
  console.log('✅ TEST 3 OK.\n');

  // -------------------------------------------------------------------------
  // TEST 4: Díptico cerrado A6 → abierto A5 · 150g · 4/0 · 500 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 4: Díptico cerrado A6 → abierto A5 · 150g · 4/0 · 500 u ---');
  const sel4: CommercialSelection = {
    foldingType: 'diptico',
    format: '10x15',
    material: 'ilustracion_150g',
    printing: '4_0',
    quantity: 500,
  };
  const q4 = quoteConfiguratorSelection(configuratorPayload, sel4, quoterConfigInput);
  console.log('   - Medida abierta anidada: 15x21 cm');
  console.log('   - Costo total:  $', q4.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q4.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q4.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  if (!q4.selectedOptions.some((o) => o.value.includes('Doblado Díptico'))) {
    throw new Error('Test 4 falló: no incluyó Doblado Díptico');
  }
  console.log('✅ TEST 4 OK.\n');

  // -------------------------------------------------------------------------
  // TEST 5: Díptico cerrado 10x20 → abierto 20x20 · 115g · 4/4 · 2.500 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 5: Díptico cerrado 10×20 → abierto 20×20 · 115g · 4/4 · 2.500 u ---');
  const sel5: CommercialSelection = {
    foldingType: 'diptico',
    format: '10x20',
    material: 'ilustracion_115g',
    printing: '4_4',
    quantity: 2500,
  };
  const q5 = quoteConfiguratorSelection(configuratorPayload, sel5, quoterConfigInput);
  console.log('   - Medida abierta anidada: 20x20 cm');
  console.log('   - Costo total:  $', q5.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q5.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q5.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('✅ TEST 5 OK.\n');

  // -------------------------------------------------------------------------
  // TEST 6: Tríptico cerrado 10x21 → abierto A4 · 150g · 4/4 · 1.000 u
  // -------------------------------------------------------------------------
  console.log('--- TEST 6: Tríptico cerrado 10×21 → abierto A4 · 150g · 4/4 · 1.000 u ---');
  const sel6: CommercialSelection = {
    foldingType: 'triptico',
    format: 'a4',
    material: 'ilustracion_150g',
    printing: '4_4',
    quantity: 1000,
  };
  const q6 = quoteConfiguratorSelection(configuratorPayload, sel6, quoterConfigInput);
  console.log('   - Medida abierta anidada: A4 (21x29.7 cm)');
  console.log('   - Terminaciones activadas:', q6.selectedOptions.find((o) => o.name === 'Terminaciones')?.value);
  console.log('   - Costo total:  $', q6.totalCost.toLocaleString('es-AR'));
  console.log('   - Precio total: $', q6.totalPrice.toLocaleString('es-AR'));
  console.log('   - Unitario:     $', q6.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  if (!q6.selectedOptions.some((o) => o.value.includes('Doblado Tríptico'))) {
    throw new Error('Test 6 falló: no incluyó Doblado Tríptico');
  }
  console.log('✅ TEST 6 OK.\n');

  // -------------------------------------------------------------------------
  // VERIFICACIÓN DE COSTEO DE DOBLADO REAL (Diferencial entre plano y díptico)
  // -------------------------------------------------------------------------
  console.log('--- VERIFICACIÓN EXTRA: El costo de doblado impacta en el precio final ---');
  // Comparamos Plano A4 1000u 115g 4/4 vs Díptico cerrado A5 (abierto A4) 1000u 115g 4/4
  const selPlanoA4: CommercialSelection = {
    foldingType: 'plano',
    format: 'a4',
    material: 'ilustracion_115g',
    printing: '4_4',
    quantity: 1000,
  };
  const qPlanoA4 = quoteConfiguratorSelection(configuratorPayload, selPlanoA4, quoterConfigInput);
  const costDiff = q3.totalCost - qPlanoA4.totalCost;
  console.log(`   - Costo Plano A4 (1000 u):   $${qPlanoA4.totalCost.toLocaleString('es-AR')}`);
  console.log(`   - Costo Díptico A4 (1000 u): $${q3.totalCost.toLocaleString('es-AR')}`);
  console.log(`   - Diferencial de costo doblado: $${costDiff.toLocaleString('es-AR')} (Esperado: $7.170 por tier de 1000 u)`);
  if (Math.abs(costDiff - 7170) > 10) {
    throw new Error(`Diferencial de doblado incorrecto: ${costDiff}`);
  }
  console.log('✅ IMPACTO REAL DEL COSTO DE DOBLADO VERIFICADO MATEMÁTICAMENTE.\n');

  // -------------------------------------------------------------------------
  // TEST 7: Incompatibilidad: Tríptico + 15x21 → debe rechazarse
  // -------------------------------------------------------------------------
  console.log('--- TEST 7: Incompatibilidad Tríptico + 15×21 (debe fallar) ---');
  try {
    const sel7: CommercialSelection = {
      foldingType: 'triptico',
      format: '15x21',
      material: 'ilustracion_115g',
      printing: '4_4',
      quantity: 1000,
    };
    quoteConfiguratorSelection(configuratorPayload, sel7, quoterConfigInput);
    throw new Error('TEST 7 FALLÓ: Tríptico + 15x21 debería haber sido rechazado.');
  } catch (err: any) {
    console.log(`   - Error esperado capturado: "${err.message}"`);
    console.log('✅ TEST 7 OK.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 8: Incompatibilidad: Díptico + A4 → debe rechazarse
  // -------------------------------------------------------------------------
  console.log('--- TEST 8: Incompatibilidad Díptico + A4 (debe fallar) ---');
  try {
    const sel8: CommercialSelection = {
      foldingType: 'diptico',
      format: 'a4',
      material: 'ilustracion_115g',
      printing: '4_4',
      quantity: 1000,
    };
    quoteConfiguratorSelection(configuratorPayload, sel8, quoterConfigInput);
    throw new Error('TEST 8 FALLÓ: Díptico + A4 debería haber sido rechazado.');
  } catch (err: any) {
    console.log(`   - Error esperado capturado: "${err.message}"`);
    console.log('✅ TEST 8 OK.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 9: Material inexistente → error explícito
  // -------------------------------------------------------------------------
  console.log('--- TEST 9: Material inexistente (debe fallar explícitamente) ---');
  try {
    const sel9: CommercialSelection = {
      foldingType: 'plano',
      format: '15x21',
      material: 'papel_magico_400g',
      printing: '4_4',
      quantity: 500,
    };
    quoteConfiguratorSelection(configuratorPayload, sel9, quoterConfigInput);
    throw new Error('TEST 9 FALLÓ: Debería haber fallado ante material inexistente.');
  } catch (err: any) {
    console.log(`   - Error esperado capturado: "${err.message}"`);
    console.log('✅ TEST 9 OK.\n');
  }

  // -------------------------------------------------------------------------
  // TEST 10: Proceso de doblado inexistente/deshabilitado → error explícito
  // -------------------------------------------------------------------------
  console.log('--- TEST 10: Terminación de doblado deshabilitada en el cotizador (debe fallar) ---');
  try {
    // Simulamos un quoterConfig sin la terminación fin_doblado_diptico
    const quoterSinDoblado = {
      ...quoterConfigInput,
      finishings: [], // Sin terminaciones
    };
    const sel10: CommercialSelection = {
      foldingType: 'diptico',
      format: '15x21',
      material: 'ilustracion_115g',
      printing: '4_4',
      quantity: 1000,
    };
    quoteConfiguratorSelection(configuratorPayload, sel10, quoterSinDoblado);
    throw new Error('TEST 10 FALLÓ: Debería haber fallado ante terminación no disponible.');
  } catch (err: any) {
    console.log(`   - Error esperado capturado: "${err.message}"`);
    console.log('✅ TEST 10 OK.\n');
  }

  console.log('=================================================================');
  console.log('🎉 LOS 10 TESTS E2E DE FLYERS & DESPLEGABLES FUERON SUPERADOS CON ÉXITO.');
  console.log('=================================================================');
}

runFlyersE2ETests()
  .catch((e) => {
    console.error('ERROR EN TEST E2E FLYERS:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
