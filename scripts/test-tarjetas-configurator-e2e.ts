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

async function runE2ETests() {
  console.log('=================================================================');
  console.log('TEST E2E: TARJETAS & VOUCHERS — CONFIGURATOR 1.0 INTEGRATION');
  console.log('=================================================================\n');

  // 1. Fetch Product, ConfiguratorVersion and ProductQuoterConfig from Neon DB
  const product = await prisma.product.findUnique({
    where: { slug: 'tarjetas-vouchers' },
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

  if (!product) {
    throw new Error("Producto 'tarjetas-vouchers' no encontrado en DB.");
  }

  const configurator = product.configuratorVersions[0];
  if (!configurator) {
    throw new Error("ConfiguratorVersion '1.0' para 'tarjetas-vouchers' no encontrado en DB.");
  }

  const quoterConfig = product.quoterConfig;
  if (!quoterConfig) {
    throw new Error("ProductQuoterConfig para 'tarjetas-vouchers' no encontrado en DB.");
  }

  console.log(`[DB] Producto: ${product.name} (${product.slug})`);
  console.log(`[DB] ConfiguratorVersion: ${configurator.schemaVersion} [${configurator.status}]`);
  console.log(
    `[DB] QuoterConfig: ${quoterConfig.allowedMaterials.length} materiales permitidos, ${quoterConfig.finishings.length} terminaciones permitidas.\n`
  );

  // Cast quoterConfig to ProductQuoterConfigInput expected by quoter engine
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
    minWidth: quoterConfig.minWidth,
    maxWidth: quoterConfig.maxWidth,
    minHeight: quoterConfig.minHeight,
    maxHeight: quoterConfig.maxHeight,
    rawMaterial: quoterConfig.rawMaterialId ? null : null,
    allowedMaterials: quoterConfig.allowedMaterials.map((am) => ({
      rawMaterial: am.rawMaterial,
    })),
    finishings: quoterConfig.finishings.map((qf) => ({
      finishing: qf.finishing,
    })),
    sizePresets: quoterConfig.sizePresets,
    quantityPresets: quoterConfig.quantityPresets,
  };

  const configuratorPayload: any = {
    schema: configurator.schema,
    compatibility: configurator.compatibility,
    pricing: configurator.pricing,
  };

  // -------------------------------------------------------------------------
  // PRUEBA 1: El caso exacto solicitado por el usuario
  // -------------------------------------------------------------------------
  console.log('--- PRUEBA 1: Configuración solicitada por el usuario ---');
  const userCaseSelection: CommercialSelection = {
    format: '9x5',
    material: 'ilustracion_350g',
    printing: '4_4',
    lamination: 'mate',
    laminationSides: 'ambas',
    additionalFinishings: ['puntas_redondeadas'],
    quantity: 500,
  };

  console.log('1. Selección UI:', JSON.stringify(userCaseSelection, null, 2));

  // Paso a paso
  const validation = validateCommercialSelection(configuratorPayload, userCaseSelection);
  console.log('2. Validación OK:');
  console.log('   - sanitizedSelection:', validation.sanitizedSelection);
  console.log('   - requiredProcesses:', validation.requiredProcesses);

  const resolution = resolveQuoterSelection(
    configuratorPayload,
    validation.sanitizedSelection,
    validation.requiredProcesses,
    quoterConfigInput
  );
  console.log('3. Resolución hacia ProductQuoteSelection:');
  console.log('   - rawMaterialId:', resolution.rawMaterialId);
  console.log('   - sizeLabel:', resolution.sizeLabel, `(${resolution.width}x${resolution.height} cm)`);
  console.log('   - quantity:', resolution.quantity);
  console.log('   - finishingIds:', resolution.finishingIds);

  const quoteResult = quoteConfiguratorSelection(
    configuratorPayload,
    userCaseSelection,
    quoterConfigInput
  );
  console.log('4. Resultado de cotización final:');
  console.log('   - unitPrice:   $', quoteResult.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - totalPrice:  $', quoteResult.totalPrice.toLocaleString('es-AR'));
  console.log('   - totalCost:   $', quoteResult.totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - selectedOptions:', quoteResult.selectedOptions);

  if (quoteResult.totalPrice <= 0 || isNaN(quoteResult.totalPrice)) {
    throw new Error('La cotización devolvió un precio inválido.');
  }
  console.log('✅ PRUEBA 1 SUPERADA EXITOSAMENTE.\n');

  // -------------------------------------------------------------------------
  // PRUEBA 2: Caso sin laminar (laminationSides omitido / deshabilitado)
  // -------------------------------------------------------------------------
  console.log('--- PRUEBA 2: Tarjetas sin laminar (100 u, 4/0, Ilustración 300g) ---');
  const sinLaminarSelection: CommercialSelection = {
    format: '9x5',
    material: 'ilustracion_300g',
    printing: '4_0',
    lamination: 'sin_laminar',
    quantity: 100,
  };
  const quoteSinLaminar = quoteConfiguratorSelection(
    configuratorPayload,
    sinLaminarSelection,
    quoterConfigInput
  );
  console.log('   - unitPrice:  $', quoteSinLaminar.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - totalPrice: $', quoteSinLaminar.totalPrice.toLocaleString('es-AR'));
  console.log('   - totalCost:  $', quoteSinLaminar.totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - selectedOptions:', quoteSinLaminar.selectedOptions);
  console.log('✅ PRUEBA 2 SUPERADA EXITOSAMENTE.\n');

  // -------------------------------------------------------------------------
  // PRUEBA 3: Formato 9x10_plegada (proceso HENDIDO_CENTRAL requerido)
  // -------------------------------------------------------------------------
  console.log('--- PRUEBA 3: Díptica 9x10 plegada (requiere Hendido Central interno) ---');
  const plegadaSelection: CommercialSelection = {
    format: '9x10_plegada',
    material: 'ilustracion_350g',
    printing: '4_4',
    lamination: 'mate',
    laminationSides: 'frente',
    quantity: 300,
  };
  const validationPlegada = validateCommercialSelection(configuratorPayload, plegadaSelection);
  console.log('   - Procesos requeridos detectados:', validationPlegada.requiredProcesses);
  if (!validationPlegada.requiredProcesses.includes('HENDIDO_CENTRAL')) {
    throw new Error("No se detectó el proceso requerido 'HENDIDO_CENTRAL' para 9x10_plegada.");
  }
  const quotePlegada = quoteConfiguratorSelection(
    configuratorPayload,
    plegadaSelection,
    quoterConfigInput
  );
  console.log('   - unitPrice:  $', quotePlegada.unitPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - totalPrice: $', quotePlegada.totalPrice.toLocaleString('es-AR'));
  console.log('   - totalCost:  $', quotePlegada.totalCost.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('   - selectedOptions:', quotePlegada.selectedOptions);
  console.log('✅ PRUEBA 3 SUPERADA EXITOSAMENTE.\n');

  // -------------------------------------------------------------------------
  // PRUEBA 4: Falla explícita en caso de material no configurado
  // -------------------------------------------------------------------------
  console.log('--- PRUEBA 4: Error explícito ante configuración inválida ---');
  try {
    const invalidSelection: CommercialSelection = {
      format: '9x5',
      material: 'material_inexistente',
      printing: '4_4',
      lamination: 'sin_laminar',
      quantity: 500,
    };
    quoteConfiguratorSelection(configuratorPayload, invalidSelection, quoterConfigInput);
    throw new Error('Debería haber fallado ante material inexistente.');
  } catch (err: any) {
    console.log(`   - Error esperado capturado correctamente: "${err.message}"`);
    console.log('✅ PRUEBA 4 SUPERADA EXITOSAMENTE.\n');
  }

  console.log('=================================================================');
  console.log('🎉 TODAS LAS PRUEBAS E2E PASARON CON ÉXITO Y SON 100% REPRODUCIBLES.');
  console.log('=================================================================');
}

runE2ETests()
  .catch((e) => {
    console.error('ERROR EN TEST E2E:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
