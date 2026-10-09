import assert from 'node:assert/strict';
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
  assert.ok(quote.totalPrice > 0);
  assert.ok(quote.selectedOptions.some((option) => option.name === 'Cantidad' && option.value.includes('100')));
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

test('flyers y tags llegan al motor físico con materiales, medidas y procesos resueltos', () => {
  for (const config of [flyersDesplegablesConfigurator, tagsEtiquetasConfigurator]) {
    const selection = defaultSelection(config);
    const quote = quoteConfiguratorSelection(config as any, selection, makeQuoterConfig(config));
    assert.ok(quote.totalPrice > 0, config.productSlug);
  }
});

console.log(`\\nResultado: ${passed} pruebas superadas.`);
