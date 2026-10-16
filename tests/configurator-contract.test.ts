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

test('tarjetas offset 9x5 OPP brillo devuelve los precios aprobados para 1000 unidades', () => {
  const config = tarjetasVouchersConfigurator as any;
  const common = {
    format: '9x5',
    material: 'ilustracion_350g',
    lamination: 'brillo',
    quantity: 1000,
  };

  const frontOnly = quoteConfiguratorSelection(config, { ...common, printing: '4_0' }, { profitMargin: 0 } as any);
  assert.equal(frontOnly.totalCost, 24000);
  assert.equal(frontOnly.totalPrice, 52500);
  assert.ok(Math.abs(frontOnly.breakdown!.marginPercent - 44.7) < 0.1);

  const frontAndBack = quoteConfiguratorSelection(config, { ...common, printing: '4_4' }, { profitMargin: 0 } as any);
  assert.equal(frontAndBack.totalCost, 30000);
  assert.equal(frontAndBack.totalPrice, 67000);
  assert.ok(Math.abs(frontAndBack.breakdown!.marginPercent - 45.8) < 0.1);
});

test('tarjetas bloquea combinaciones sin precio comercial aprobado', () => {
  const config = tarjetasVouchersConfigurator as any;
  assert.throws(
    () => quoteConfiguratorSelection(config, {
      format: '9x5',
      material: 'ilustracion_350g',
      printing: '4_4',
      lamination: 'sin_laminar',
      quantity: 1000,
    }, { profitMargin: 0 } as any),
    /no tiene un precio comercial aprobado/
  );
  assert.throws(
    () => quoteConfiguratorSelection(config, {
      format: '9x5',
      material: 'ilustracion_350g',
      printing: '4_4',
      lamination: 'brillo',
      quantity: 500,
    }, { profitMargin: 0 } as any),
    /requiere cotización para la cantidad seleccionada/
  );
});

test('stickers usa la matriz de la medida/cantidad seleccionadas y no acepta cantidades inventadas', () => {
  const config = adhesivosStickersConfigurator;
  const selection = defaultSelection(config);
  const quote = quoteConfiguratorSelection(config as any, selection, { profitMargin: 0 } as any);
  assert.ok(quote.totalPrice > 0);
  assert.throws(
    () => quoteConfiguratorSelection(config as any, { ...selection, quantity: 999 }, { profitMargin: 0 } as any),
    /Cantidad '999' no permitida/
  );
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

test('flyers offset 10x15 150g 4/4 usa costo terminado y precio comercial aprobado para 1000 y 5000', () => {
  const config = flyersDesplegablesConfigurator as any;
  const base = {
    foldingType: 'plano',
    format: '10x15',
    material: 'ilustracion_150g',
    printing: '4_4',
  };

  const quote1000 = quoteConfiguratorSelection(config, { ...base, quantity: 1000 }, makeQuoterConfig(config));
  assert.equal(quote1000.totalCost, 32000);
  assert.equal(quote1000.totalPrice, 72000);
  assert.ok(Math.abs((quote1000.breakdown!.marginPercent) - 46.2) < 0.1);

  const quote5000 = quoteConfiguratorSelection(config, { ...base, quantity: 5000 }, makeQuoterConfig(config));
  assert.equal(quote5000.totalCost, 85000);
  assert.equal(quote5000.totalPrice, 166500);
  assert.ok(Math.abs((quote5000.breakdown!.marginPercent) - 38.2) < 0.1);
});

test('flyers offset no usa el motor genérico para cantidades sin precio comercial aprobado', () => {
  const config = flyersDesplegablesConfigurator as any;
  assert.throws(
    () => quoteConfiguratorSelection(config, {
      foldingType: 'plano',
      format: '10x15',
      material: 'ilustracion_150g',
      printing: '4_4',
      quantity: 2500,
    }, makeQuoterConfig(config)),
    /requiere cotización para la cantidad seleccionada/
  );
});

test('payload real de la tienda para flyers aplica precio comercial aprobado en 1000 y 5000', () => {
  const config = flyersDesplegablesConfigurator as any;
  const quoter = makeQuoterConfig(config);
  for (const [quantity, expectedPrice, expectedCost] of [
    [1000, 72000, 32000],
    [5000, 166500, 85000],
  ]) {
    const quote = quoteConfiguratorSelection(config, {
      rawMaterialId: 'raw_mat_ilustracion_150g_4_4',
      sizeLabel: '10x15 cm',
      quantity,
      finishingIds: [],
    }, quoter);
    assert.equal(quote.totalPrice, expectedPrice);
    assert.equal(quote.totalCost, expectedCost);
  }
});

test('payload genérico de flyers no cubierto conserva el cotizador existente', () => {
  const config = flyersDesplegablesConfigurator as any;
  const quote = quoteConfiguratorSelection(config, {
    rawMaterialId: 'raw_mat_ilustracion_150g_4_0',
    sizeLabel: '10x15 cm',
    quantity: 1000,
    finishingIds: [],
  }, makeQuoterConfig(config));
  assert.ok(quote.totalPrice > 0);
  assert.notEqual(quote.totalPrice, 72000);
});

test('payload de flyers 10x15 150g 4/4 sin precio aprobado exige consulta', () => {
  const config = flyersDesplegablesConfigurator as any;
  assert.throws(
    () => quoteConfiguratorSelection(config, {
      rawMaterialId: 'raw_mat_ilustracion_150g_4_4',
      sizeLabel: '10x15 cm',
      quantity: 2500,
      finishingIds: [],
    }, makeQuoterConfig(config)),
    /requiere cotización para la cantidad seleccionada/
  );
});

test('flyers offset bloquea el precio configurado si cae debajo del margen bruto mínimo', () => {
  const config = structuredClone(flyersDesplegablesConfigurator) as any;
  config.pricing.commercialPriceOverrides.minimumGrossMarginPercent = 50;
  assert.throws(
    () => quoteConfiguratorSelection(config, {
      foldingType: 'plano',
      format: '10x15',
      material: 'ilustracion_150g',
      printing: '4_4',
      quantity: 1000,
    }, makeQuoterConfig(config)),
    /no alcanza el margen bruto mínimo/
  );
});

test('flyers y tags llegan al motor físico con materiales, medidas y procesos resueltos', () => {
  for (const config of [flyersDesplegablesConfigurator, tagsEtiquetasConfigurator]) {
    const selection = defaultSelection(config);
    const quote = quoteConfiguratorSelection(config as any, selection, makeQuoterConfig(config));
    assert.ok(quote.totalPrice > 0, config.productSlug);
  }
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
