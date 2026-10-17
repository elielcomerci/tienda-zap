import assert from 'node:assert/strict';
import { validateClientFile, isSafeInlineClientFile, isClientWorkFilesEnabled } from '../src/lib/client-work-files';
import {
  adhesivosStickersConfigurator,
  carpetasFoldersConfigurator,
  flyersDesplegablesConfigurator,
  impresosPackagingConfigurators,
  tagsEtiquetasConfigurator,
  tarjetasVouchersConfigurator,
} from '../prisma/seed/data/06-configurators/impresos-packaging';
import {
  quoteConfiguratorSelection,
  validateCommercialSelection,
} from '../src/lib/pricing/configurator-adapter';
import {
  collectEditableProviderCostValues,
  flattenProviderCostMatrix,
  isEditableProviderCostPath,
} from '../src/lib/pricing/pricing-matrix-admin';
import { calculateCommercialPrice, calculatePriceAtNetAmount, marginFromMarkup, validateCommercialPricingPolicy } from '../src/lib/pricing/commercial-pricing-policy';
import { initialQuoterConfigs, sheetFinishingOperations } from '../prisma/seed/data/09-quoter-config';

type Config = (typeof impresosPackagingConfigurators)[number];

const supportedPricingEngines = new Set(['PROVIDER_FINISHED_COST', 'PRODUCT_QUOTER', 'STICKER_TABLE', 'TIERED_UNIT_TABLE']);

const configs: Config[] = [
  tarjetasVouchersConfigurator,
  flyersDesplegablesConfigurator,
  tagsEtiquetasConfigurator,
  adhesivosStickersConfigurator,
  carpetasFoldersConfigurator,
];

let passed = 0;
const test = (name: string, run: () => void) => {
  run();
  passed += 1;
  console.log(`✓ ${name}`);
};

function defaultSelection(config: Config): Record<string, any> {
  const selection: Record<string, any> = {};
  for (const [key, field] of Object.entries(config.schema.fields as Record<string, any>)) {
    if (field.default !== undefined) selection[key] = field.default;
  }
  return selection;
}

function makeQuoterConfig(config: Config): any {
  const adapter = (config.pricing as any)?.adapter || {};
  const materialIds = new Set<string>();
  for (const byPrinting of Object.values(adapter.materialResolution || {}) as any[]) {
    for (const id of Object.values(byPrinting)) if (typeof id === 'string') materialIds.add(id);
  }

  const sizeMap = new Map<string, { label: string; width: number; height: number }>();
  for (const entry of Object.values(adapter.formatMapping || {}) as any[]) {
    sizeMap.set(entry.sizeLabel, { label: entry.sizeLabel, width: entry.width, height: entry.height });
  }
  for (const byFormat of Object.values(adapter.matrixFormatMapping || {}) as any[]) {
    for (const entry of Object.values(byFormat) as any[]) {
      sizeMap.set(entry.sizeLabel, { label: entry.sizeLabel, width: entry.width, height: entry.height });
    }
  }

  const finishingIds = new Set<string>();
  for (const bySide of Object.values(adapter.laminationResolution || {}) as any[]) {
    for (const id of Object.values(bySide)) if (typeof id === 'string') finishingIds.add(id);
  }
  for (const id of Object.values(adapter.additionalFinishingsResolution || {}) as any[]) {
    if (typeof id === 'string') finishingIds.add(id);
  }
  for (const id of Object.values(adapter.processResolution || {}) as any[]) {
    if (typeof id === 'string') finishingIds.add(id);
  }

  const tiers = [{ minQty: 1, maxQty: null, unitPrice: 100 }];
  const quantityField = (config.schema.fields as any).quantity;
  const quantities = quantityField?.type === 'quantity_selector'
    ? (quantityField.options || []).map((option: any) => ({ quantity: option.value }))
    : [{ quantity: 1 }, { quantity: 50 }, { quantity: 500 }, { quantity: 1000 }];

  return {
    pricingMode: 'SHEET',
    itemWidth: null,
    itemHeight: null,
    margin: 0,
    bleed: 0,
    profitMargin: 0,
    minProfitMargin: null,
    maxProfitMargin: null,
    allowCustomSize: false,
    minWidth: null,
    maxWidth: null,
    minHeight: null,
    maxHeight: null,
    allowedMaterials: Array.from(materialIds).map((id) => ({
      rawMaterial: { id, name: id, width: 32, height: 46, unit: 'SHEET', tiers },
    })),
    finishings: Array.from(finishingIds).map((id) => ({
      finishing: { id, name: id, costType: 'FIXED_SETUP', tiers },
    })),
    sizePresets: Array.from(sizeMap.values()),
    quantityPresets: quantities,
  };
}

test('los cinco configuradores tienen slug/version coherentes y campos utilizables', () => {
  assert.equal(configs.length, 5);
  assert.equal(new Set(configs.map((config) => config.productSlug)).size, 5);

  for (const config of configs) {
    assert.equal(config.schema.productSlug, config.productSlug, config.productSlug);
    assert.equal(config.schema.engine, 'IMPRESOS_PACKAGING', config.productSlug);
    assert.ok(supportedPricingEngines.has((config.pricing as any)?.engine), `${config.productSlug}: motor de pricing no reconocido`);
    assert.ok(config.schema.fields && Object.keys(config.schema.fields).length > 0, config.productSlug);

    for (const [key, field] of Object.entries(config.schema.fields as Record<string, any>)) {
      if (field.default === undefined) continue;
      if (field.type === 'select') {
        assert.ok(field.options.some((option: any) => option.id === field.default), `${config.productSlug}.${key}: default`);
      } else if (field.type === 'quantity_selector') {
        assert.ok(field.options.some((option: any) => option.value === field.default), `${config.productSlug}.${key}: default`);
      } else if (field.type === 'multiselect') {
        assert.ok(Array.isArray(field.default), `${config.productSlug}.${key}: default debe ser lista`);
        for (const value of field.default) {
          assert.ok(field.options.some((option: any) => option.id === value), `${config.productSlug}.${key}: default multiselect`);
        }
      } else if (field.type === 'quantity_input' || field.type === 'number') {
        assert.ok(Number.isInteger(field.default), `${config.productSlug}.${key}: default entero`);
        if (field.min !== undefined) assert.ok(field.default >= field.min, `${config.productSlug}.${key}: mínimo`);
        if (field.max !== undefined) assert.ok(field.default <= field.max, `${config.productSlug}.${key}: máximo`);
      }
    }
  }
});

test('los valores predeterminados de los cinco configuradores pasan la validación comercial', () => {
  for (const config of configs) {
    const selection = defaultSelection(config);
    assert.doesNotThrow(() => validateCommercialSelection(config as any, selection), config.productSlug);
  }
});

test('los formatos permitidos por tipo de plegado existen en las opciones visibles', () => {
  const config = flyersDesplegablesConfigurator;
  const formatIds = (config.schema.fields as any).format.options.map((option: any) => option.id);
  for (const [foldingType, formats] of Object.entries(config.compatibility?.allowedFormats || {})) {
    assert.ok((config.schema.fields as any).foldingType.options.some((option: any) => option.id === foldingType));
    for (const format of formats) assert.ok(formatIds.includes(format), `${foldingType}: ${format}`);
  }
  assert.throws(
    () => validateCommercialSelection(config as any, { ...defaultSelection(config), foldingType: 'triptico', format: '15x21' }),
    /no es compatible/
  );
});

test('los procesos obligatorios están resueltos a terminaciones reales del adapter', () => {
  for (const config of configs) {
    const processes = config.compatibility?.requiredProcesses || [];
    if (!processes.length) continue;
    const adapter = (config.pricing as any)?.adapter;
    assert.ok(adapter, `${config.productSlug}: falta adapter`);
    for (const rule of processes) {
      assert.ok(adapter.processResolution?.[rule.process], `${config.productSlug}: proceso ${rule.process} sin resolver`);
    }
  }

  const tagSelection = defaultSelection(tagsEtiquetasConfigurator);
  const result = validateCommercialSelection(tagsEtiquetasConfigurator as any, tagSelection);
  assert.deepEqual(result.requiredProcesses, ['PERFORACION']);
});

test('tarjetas cotiza con costo de proveedor conocido y respeta la selección', () => {
  const config = tarjetasVouchersConfigurator;
  const selection = defaultSelection(config);
  const quote = quoteConfiguratorSelection(config as any, selection, { profitMargin: 0 } as any);
  assert.equal(quote.totalCost, 8213);
  assert.equal(quote.totalPrice, 18890);
  assert.equal(quote.taxTreatment, 'INCLUDED');
  assert.ok(Math.abs((quote.netPrice ?? 0) - (quote.totalPrice / 1.21)) < 0.01);
  assert.ok(Math.abs((quote.vatAmount ?? 0) - (quote.totalPrice - quote.netPrice!)) < 0.01);
  assert.ok(quote.selectedOptions.some((option) => option.name === 'Cantidad' && option.value.includes('100')));

  const twoHundred = quoteConfiguratorSelection(
    config as any,
    { ...selection, quantity: 200 },
    { profitMargin: 150 } as any,
  );
  assert.equal(twoHundred.totalCost, 12361);
  assert.equal(twoHundred.totalPrice, 28490);
  assert.equal(twoHundred.taxTreatment, 'INCLUDED');
  assert.ok(Math.abs((twoHundred.netPrice ?? 0) - (twoHundred.totalPrice / 1.21)) < 0.01);

  const threeHundred = quoteConfiguratorSelection(
    config as any,
    { ...selection, quantity: 300 },
    { profitMargin: 150 } as any,
  );
  assert.equal(threeHundred.totalCost, 17029);
  assert.equal(threeHundred.totalPrice, 39190);
  assert.equal(threeHundred.taxTreatment, 'INCLUDED');

  const fiveHundredSimplex = quoteConfiguratorSelection(
    config as any,
    { ...selection, quantity: 500, printing: '4_0', lamination: 'sin_laminar' },
    { profitMargin: 150 } as any,
  );
  assert.equal(fiveHundredSimplex.totalCost, 19219);
  assert.equal(fiveHundredSimplex.totalPrice, 44190);
  assert.equal(fiveHundredSimplex.taxTreatment, 'INCLUDED');

  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, quantity: 500 }, { profitMargin: 150 } as any),
    /CONSULT_REQUIRED: Esta combinación necesita validación comercial/,
  );
});

test('stickers habilita solo 500 unidades de 5x5 cm con precio final e IVA explícitos', () => {
  const config = adhesivosStickersConfigurator;
  const selection = defaultSelection(config);
  const quote = quoteConfiguratorSelection(config as any, selection, { profitMargin: 0 } as any);
  assert.equal(quote.totalCost, 19231);
  assert.equal(quote.totalPrice, 51290);
  assert.equal(quote.taxTreatment, 'INCLUDED');
  assert.equal(quote.vatRatePercent, 21);
  assert.ok(Math.abs((quote.netPrice ?? 0) - (quote.totalPrice / 1.21)) < 0.01);
  assert.ok(Math.abs((quote.vatAmount ?? 0) - (quote.totalPrice - quote.netPrice!)) < 0.01);
  assert.ok((quote.breakdown?.marginPercent ?? 0) > 54 && (quote.breakdown?.marginPercent ?? 0) < 55);

  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, quantity: 1000 }, { profitMargin: 0 } as any),
    /CONSULT_REQUIRED: Esta combinación necesita validación comercial/,
  );
  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, format: '4x4' }, { profitMargin: 0 } as any),
    /CONSULT_REQUIRED: Esta combinación necesita validación comercial/,
  );
  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, quantity: 999 }, { profitMargin: 0 } as any),
    /Cantidad '999' no permitida/,
  );
});

test('stickers y carpetas aplican política comercial versionada y tratamiento fiscal explícito', () => {
  assert.equal(
    initialQuoterConfigs.some((entry) => entry.productSlug === 'adhesivos-stickers'),
    false,
    'stickers usa su política comercial explícita, no el recargo maestro heredado',
  );

  const folderConfig = initialQuoterConfigs.find((entry) => entry.productSlug === 'carpetas-folders');
  assert.ok(folderConfig, 'carpetas-folders: falta ProductQuoterConfig en el seed');
  assert.equal(folderConfig.profitMargin, 150, 'el recargo heredado se conserva como fallback');
  assert.equal(folderConfig.minProfitMargin, 120);
  assert.equal(folderConfig.maxProfitMargin, 180);

  const stickersSelection = defaultSelection(adhesivosStickersConfigurator);
  const stickerQuote = quoteConfiguratorSelection(adhesivosStickersConfigurator as any, stickersSelection);
  assert.equal(stickerQuote.totalPrice, 51290);
  assert.equal(stickerQuote.taxTreatment, 'INCLUDED');

  const foldersSelection = defaultSelection(carpetasFoldersConfigurator);
  const foldersQuote = quoteConfiguratorSelection(
    carpetasFoldersConfigurator as any,
    foldersSelection,
    folderConfig as any,
  );
  assert.equal(foldersQuote.totalCost, 82350);
  assert.equal(foldersQuote.totalPrice, 139590);
  assert.equal(foldersQuote.taxTreatment, 'INCLUDED');
  assert.equal(foldersQuote.vatRatePercent, 21);
  assert.ok(Math.abs((foldersQuote.breakdown?.marginPercent ?? 0) - 28.6) < 0.2);
});

test('carpetas cotiza cantidad exacta y rechaza cantidades fuera de rango', () => {
  const config = carpetasFoldersConfigurator;
  const selection = defaultSelection(config);
  const quote = quoteConfiguratorSelection(config as any, selection, { profitMargin: 0 } as any);
  const tiers = (config.pricing as any).providerFinishedCostMatrix.digital_300g.tiers;
  const tier = tiers.find((entry: any) => selection.quantity >= entry.minQty && selection.quantity <= entry.maxQty);
  const unitPrice = tier.prices[selection.printing][selection.lamination];
  assert.equal(quote.totalCost, (unitPrice + (selection.flap === 'impresa' ? tier.flapSurcharge || 0 : 0)) * selection.quantity);
  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, quantity: 1001 }, { profitMargin: 0 } as any),
    /Cantidad máxima permitida/
  );
});

test('la perforación solo usa los importes de proveedor documentados por lote', () => {
  const perforation = sheetFinishingOperations.find((entry) => entry.id === 'fin_perforacion');
  assert.ok(perforation);
  assert.equal(perforation.costType, 'FIXED_SETUP');
  assert.deepEqual(perforation.tiers, [
    { minQty: 500, maxQty: 500, unitPrice: 3225 },
    { minQty: 1000, maxQty: 1000, unitPrice: 4500 },
  ]);
});

test('flyers habilita 1.000 unidades 10x15 cm 4/4 con costo terminado offset e IVA explícito', () => {
  const config = flyersDesplegablesConfigurator;
  const selection = {
    ...defaultSelection(config),
    foldingType: 'plano',
    format: '10x15',
    material: 'ilustracion_115g',
    printing: '4_4',
    quantity: 1000,
  };
  const quote = quoteConfiguratorSelection(config as any, selection, makeQuoterConfig(config));
  assert.equal(quote.totalCost, 25000);
  assert.equal(quote.totalPrice, 52990);
  assert.equal(quote.taxTreatment, 'INCLUDED');
  assert.equal(quote.vatRatePercent, 21);
  assert.ok(Math.abs((quote.netPrice ?? 0) - quote.totalPrice / 1.21) < 0.01);

  assert.throws(
    () => quoteConfiguratorSelection(config as any, defaultSelection(config), makeQuoterConfig(config)),
    /CONSULT_REQUIRED: Esta combinación necesita validación comercial/,
  );
});

test('tags sigue en consulta porque el motor no incorpora impresión de proveedor', () => {
  const selection = defaultSelection(tagsEtiquetasConfigurator);
  assert.throws(
    () => quoteConfiguratorSelection(tagsEtiquetasConfigurator as any, selection, makeQuoterConfig(tagsEtiquetasConfigurator)),
    /CONSULT_REQUIRED: El costo de proveedor necesita validación comercial/,
  );
});


test('el editor de Precios ZAP solo expone importes y excluye metadatos de la matriz', () => {
  const matrix = {
    tiers: [{
      minQty: 100,
      maxQty: 500,
      prices: { '4_0': 12500, '4_4': 17800 },
      flapSurcharge: 450,
    }],
    paperSurcharges: { ilustracion_350g: 10 },
    surchargePercent: 30,
    deliverySurcharges: { express_48h: 15 },
    metadata: { width: 21, height: 29.7 },
  };

  const rows = flattenProviderCostMatrix(matrix);
  assert.deepEqual(rows.map((row) => row.value), [12500, 17800, 450]);
  assert.deepEqual(collectEditableProviderCostValues(matrix), [12500, 17800, 450]);
  assert.equal(isEditableProviderCostPath(['providerFinishedCostMatrix', 'tiers', '0', 'minQty']), false);
  assert.equal(isEditableProviderCostPath(['providerFinishedCostMatrix', 'paperSurcharges', 'ilustracion_350g']), false);
  assert.equal(isEditableProviderCostPath(['providerFinishedCostMatrix', 'tiers', '0', 'prices', '4_0']), true);

  const readableRows = flattenProviderCostMatrix({
    tiers: {
      deluxe: {
        finishes: {
          opp_mate_laca_uv_sectorizada: {
            printing: {
              '4_4': {
                sectorizedSides: {
                  frente: { '9x5': { '500': 31000 } },
                },
              },
            },
          },
        },
      },
    },
  });
  assert.equal(
    readableRows[0]?.label,
    'Deluxe · OPP mate + laca UV sectorizada · Impresión · 4/4 · Laterales sectorizados · Frente · 9 × 5 · 500 unidades',
  );
});

test('la política comercial distingue margen sobre venta y recargo sobre costo', () => {
  assert.equal(marginFromMarkup(150), 60);
  const marginPolicy = validateCommercialPricingPolicy({ version: 1, mode: 'MARGIN', percentage: 50, vatRatePercent: 21 });
  const calculation = calculateCommercialPrice(1000, marginPolicy);
  assert.ok(calculation.finalPrice >= 2420);
  assert.equal(Math.round(calculation.vatAmount * 100), Math.round((calculation.finalPrice - calculation.netPrice) * 100));
  assert.ok(Math.abs(calculation.grossProfit - (calculation.netPrice - 1000)) < 0.000001);
  assert.ok(Math.abs(calculation.grossMarginPercent - ((calculation.netPrice - 1000) / calculation.netPrice) * 100) < 0.000001);
  const loss = calculatePriceAtNetAmount(1000, 800, 21);
  assert.equal(loss.grossProfit, -200);
  assert.equal(loss.finalPrice, 968);
  assert.ok(loss.grossMarginPercent < 0);
  assert.throws(() => validateCommercialPricingPolicy({ version: 1, mode: 'MARGIN', percentage: 100, vatRatePercent: 21 }), /menor que 100/);
});

test('el cotizador de proveedor prioriza la política de la versión activa', () => {
  const base = tarjetasVouchersConfigurator;
  const config = {
    ...base,
    pricing: {
      ...(base.pricing as any),
      commercialPricingPolicy: { version: 1, mode: 'MARGIN', percentage: 50, vatRatePercent: 21 },
    },
  };
  const selection = defaultSelection(base);
  const quote = quoteConfiguratorSelection(config as any, selection, { profitMargin: 150 } as any);
  const expected = calculateCommercialPrice(8213, {
    version: 1, mode: 'MARGIN', percentage: 50, vatRatePercent: 21,
  });
  assert.equal(quote.totalCost, 8213);
  assert.equal(quote.totalPrice, expected.finalPrice);
  assert.ok(Math.abs((quote.breakdown?.marginAmount ?? 0) - expected.grossProfit) < 0.000001);
  assert.ok(Math.abs((quote.breakdown?.marginPercent ?? 0) - expected.grossMarginPercent) < 0.000001);
});

test('archivos de trabajo acepta formatos habituales y limita tamaño/formato', () => {
  assert.equal(validateClientFile({ fileName: 'marca.pdf', contentType: 'application/pdf', sizeBytes: 1024 }).ok, true);
  assert.equal(validateClientFile({ fileName: 'fuente.cdr', contentType: 'application/octet-stream', sizeBytes: 1024 }).ok, true);
  assert.equal(validateClientFile({ fileName: 'malware.exe', contentType: 'application/octet-stream', sizeBytes: 1024 }).ok, false);
  assert.equal(validateClientFile({ fileName: 'video.mp4', contentType: 'video/mp4', sizeBytes: 150 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(validateClientFile({ fileName: 'sin-extension', contentType: 'application/octet-stream', sizeBytes: 100 }).ok, false);
});

test('la vista previa en línea se limita a formatos con soporte seguro conocido', () => {
  assert.equal(isSafeInlineClientFile({ fileName: 'presentacion.pdf', contentType: 'application/pdf' }), true);
  assert.equal(isSafeInlineClientFile({ fileName: 'foto.png', contentType: 'image/png' }), true);
  assert.equal(isSafeInlineClientFile({ fileName: 'audio.mp3', contentType: 'audio/mpeg' }), true);
  assert.equal(isSafeInlineClientFile({ fileName: 'video.mp4', contentType: 'video/mp4' }), true);
  assert.equal(isSafeInlineClientFile({ fileName: 'diseno.ai', contentType: 'application/postscript' }), false);
  assert.equal(isSafeInlineClientFile({ fileName: 'imagen.svg', contentType: 'image/svg+xml' }), false);
});


test('el módulo de archivos permanece desactivado por defecto y requiere habilitación explícita', () => {
  const original = process.env.CLIENT_WORK_FILES_ENABLED;
  delete process.env.CLIENT_WORK_FILES_ENABLED;
  assert.equal(isClientWorkFilesEnabled(), false);
  process.env.CLIENT_WORK_FILES_ENABLED = 'true';
  assert.equal(isClientWorkFilesEnabled(), true);
  if (original === undefined) delete process.env.CLIENT_WORK_FILES_ENABLED;
  else process.env.CLIENT_WORK_FILES_ENABLED = original;
});

console.log(`\\nResultado: ${passed} pruebas superadas.`);
