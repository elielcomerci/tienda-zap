import {
  calculateProductQuote,
  type ProductQuoterConfigInput,
  type ProductQuoteSelection,
  type ProductQuoteResult,
  getQuoterMaterials,
} from './product-quoter';

export interface CommercialSelection {
  format?: string;
  material?: string;
  printing?: string;
  lamination?: string;
  laminationSides?: string;
  additionalFinishings?: string[];
  quantity?: number;
  foldingType?: string;
  shape?: string;
  flap?: string;
  [key: string]: any;
}

export interface ConfiguratorVersionPayload {
  schema: {
    engine?: string;
    productSlug?: string;
    fields?: Record<string, any>;
    [key: string]: any;
  };
  compatibility?: {
    uiRules?: Array<{
      field: string;
      condition: { field: string; operator: string; value: any };
      action: string;
    }>;
    allowedFormats?: Record<string, string[]>;
    requiredProcesses?: Array<{
      condition: { field: string; operator: string; value: any };
      process: string;
    }>;
    [key: string]: any;
  } | null;
  pricing?: {
    engine?: string;
    matrix?: Record<string, Record<string, Record<string, number>>>;
    modifiers?: Record<string, { type: 'PERCENTAGE' | 'FIXED'; value: number }>;
    tieredUnitTable?: {
      tiers: Array<{
        minQty: number;
        maxQty: number;
        prices: Record<string, Record<string, number>>;
        flapSurcharge?: number;
      }>;
    };
    adapter?: {
      formatMapping?: Record<string, { sizeLabel: string; width: number; height: number; [key: string]: any }>;
      matrixFormatMapping?: Record<
        string,
        Record<string, { sizeLabel: string; width: number; height: number; [key: string]: any }>
      >;
      materialResolution?: Record<string, Record<string, string>>;
      laminationResolution?: Record<string, Record<string, string>>;
      additionalFinishingsResolution?: Record<string, string>;
      processResolution?: Record<string, string>;
      [key: string]: any;
    };
    [key: string]: any;
  } | null;
}

/**
 * Valida la selección comercial contra el schema y las reglas de compatibilidad de ConfiguratorVersion.
 */
export function validateCommercialSelection(
  configurator: ConfiguratorVersionPayload,
  selection: CommercialSelection
): { sanitizedSelection: CommercialSelection; requiredProcesses: string[] } {
  const fields = configurator.schema?.fields;
  if (!fields) {
    throw new Error('Configuración inválida: El configurador no posee campos definidos en su schema.');
  }

  const sanitized: CommercialSelection = { ...selection };

  // 1. Validar campos declarados en el schema
  for (const [fieldKey, fieldDef] of Object.entries(fields)) {
    const val = selection[fieldKey];

    // Campo requerido no provisto
    if (fieldDef.required && (val === undefined || val === null || val === '')) {
      throw new Error(`Configuración incompleta: Debe seleccionar '${fieldDef.label || fieldKey}'.`);
    }

    if (val !== undefined && val !== null && val !== '') {
      if (fieldDef.type === 'quantity_selector') {
        const qtyOpts = fieldDef.options || [];
        if (!qtyOpts.some((opt: any) => opt.value === val)) {
          throw new Error(`Cantidad '${val}' no permitida para este configurador.`);
        }
      } else if (fieldDef.type === 'quantity_input' || fieldDef.type === 'number') {
        const numVal = Number(val);
        if (isNaN(numVal) || !Number.isInteger(numVal)) {
          throw new Error(`Cantidad debe ser un número entero.`);
        }
        if (fieldDef.min !== undefined && numVal < fieldDef.min) {
          throw new Error(`Cantidad mínima permitida: ${fieldDef.min} unidades.`);
        }
        if (fieldDef.max !== undefined && numVal > fieldDef.max) {
          throw new Error(`Cantidad máxima permitida: ${fieldDef.max} unidades.`);
        }
      } else if (fieldDef.type === 'multiselect') {
        if (!Array.isArray(val)) {
          throw new Error(`Campo '${fieldKey}' debe ser una lista de opciones.`);
        }
        const allowedIds = (fieldDef.options || []).map((opt: any) => opt.id);
        for (const item of val) {
          if (!allowedIds.includes(item)) {
            throw new Error(`Opción '${item}' no válida para el campo '${fieldKey}'.`);
          }
        }
      } else if (fieldDef.type === 'select') {
        const allowedIds = (fieldDef.options || []).map((opt: any) => opt.id);
        if (!allowedIds.includes(val)) {
          throw new Error(`Opción '${val}' no válida para '${fieldDef.label || fieldKey}'.`);
        }
      }
    }
  }

  // 2. Reglas condicionales especiales (ej: laminationSides si lamination === 'sin_laminar')
  if (fields.lamination && fields.laminationSides) {
    if (selection.lamination === 'sin_laminar') {
      delete sanitized.laminationSides;
    } else if (selection.lamination) {
      if (!selection.laminationSides) {
        throw new Error("Debe seleccionar las caras a laminar ('frente' o 'ambas').");
      }
      const sidesOptions = fields.laminationSides.options || [];
      if (!sidesOptions.some((opt: any) => opt.id === selection.laminationSides)) {
        throw new Error(`Opción de caras de laminado '${selection.laminationSides}' no válida.`);
      }
    }
  }

  // 3. Reglas de compatibilidad: allowedFormats por foldingType
  if (configurator.compatibility?.allowedFormats && selection.foldingType && selection.format) {
    const allowedForFolding = configurator.compatibility.allowedFormats[selection.foldingType];
    if (allowedForFolding && !allowedForFolding.includes(selection.format)) {
      throw new Error(
        `Formato '${selection.format}' no es compatible con el tipo de plegado '${selection.foldingType}'.`
      );
    }
  }

  // 4. Evaluar procesos requeridos por compatibilidad
  const requiredProcesses: string[] = [];
  const compRules = configurator.compatibility?.requiredProcesses || [];
  for (const rule of compRules) {
    const fieldVal = (selection as any)[rule.condition.field];
    let matches = false;
    if (rule.condition.operator === 'eq') {
      matches = fieldVal === rule.condition.value;
    } else if (rule.condition.operator === 'neq') {
      matches = fieldVal !== rule.condition.value;
    } else if (rule.condition.operator === 'exists') {
      // 'exists' dispara el proceso siempre que el campo tenga un valor definido.
      // Usado para procesos productivos obligatorios independientes de la selección
      // (ej: perforación siempre requerida en Tags & Etiquetas).
      matches = fieldVal !== undefined && fieldVal !== null && fieldVal !== '';
    }
    if (matches) {
      requiredProcesses.push(rule.process);
    }
  }

  return {
    sanitizedSelection: sanitized,
    requiredProcesses,
  };
}

/**
 * Resuelve la selección comercial validada contra los registros reales de ProductQuoterConfig
 * a través de pricing.adapter.
 * Falla explícitamente si falta cualquier materia prima o terminación requerida.
 */
export function resolveQuoterSelection(
  configurator: ConfiguratorVersionPayload,
  sanitizedSelection: CommercialSelection,
  requiredProcesses: string[],
  quoterConfig: ProductQuoterConfigInput
): ProductQuoteSelection {
  const adapter = configurator.pricing?.adapter;
  if (!adapter) {
    throw new Error('Error de configuración: El configurador no posee adapter de pricing configurado.');
  }

  // A. Resolver Formato / Medidas Abiertas para Nesting
  let formatInfo: { sizeLabel: string; width: number; height: number; [key: string]: any } | undefined;

  if (sanitizedSelection.foldingType && adapter.matrixFormatMapping?.[sanitizedSelection.foldingType]) {
    formatInfo = adapter.matrixFormatMapping[sanitizedSelection.foldingType][sanitizedSelection.format || ''];
  }

  if (!formatInfo && sanitizedSelection.format) {
    formatInfo = adapter.formatMapping?.[sanitizedSelection.format];
  }

  if (!formatInfo) {
    throw new Error(
      `Error de configuración: Formato comercial '${sanitizedSelection.format}' (plegado: '${sanitizedSelection.foldingType || 'n/a'}') no mapeado en el adapter.`
    );
  }

  const presetMatch = quoterConfig.sizePresets.find((p) => p.label === formatInfo!.sizeLabel);
  if (!presetMatch && !quoterConfig.allowCustomSize) {
    throw new Error(
      `Error de configuración: La medida abierta '${formatInfo.sizeLabel}' no está habilitada en el cotizador del producto.`
    );
  }

  // B. Resolver Materia Prima por identidad estable (RawMaterial.id)
  const materialMap = adapter.materialResolution?.[sanitizedSelection.material || ''];
  if (!materialMap) {
    throw new Error(`Error de configuración: Material '${sanitizedSelection.material}' no mapeado en el adapter.`);
  }

  const rawMaterialId = materialMap[sanitizedSelection.printing || ''];
  if (!rawMaterialId) {
    throw new Error(
      `Error de configuración: Combinación de material '${sanitizedSelection.material}' e impresión '${sanitizedSelection.printing}' no mapeada.`
    );
  }

  const availableMaterials = getQuoterMaterials(quoterConfig);
  const materialExists = availableMaterials.some((m) => m.id === rawMaterialId);
  if (!materialExists) {
    throw new Error(
      `Error de configuración: La materia prima real con ID '${rawMaterialId}' no está asignada a este producto en el cotizador.`
    );
  }

  // C. Resolver Terminaciones
  const resolvedFinishingIds: string[] = [];
  const availableFinishings = quoterConfig.finishings.map((f) => f.finishing.id);

  // C1. Laminado (si corresponde)
  if (sanitizedSelection.lamination && sanitizedSelection.lamination !== 'sin_laminar') {
    const lamSides = sanitizedSelection.laminationSides || 'frente';
    const laminationMap = adapter.laminationResolution?.[sanitizedSelection.lamination];
    if (!laminationMap) {
      throw new Error(`Error de configuración: Tipo de laminado '${sanitizedSelection.lamination}' no mapeado en el adapter.`);
    }

    const laminationFinishingId = laminationMap[lamSides];
    if (!laminationFinishingId) {
      throw new Error(
        `Error de configuración: Laminado '${sanitizedSelection.lamination}' para caras '${lamSides}' no mapeado.`
      );
    }

    if (!availableFinishings.includes(laminationFinishingId)) {
      throw new Error(
        `Error de configuración: La terminación de laminado '${laminationFinishingId}' no está disponible en este producto.`
      );
    }

    resolvedFinishingIds.push(laminationFinishingId);
  }

  // C2. Terminaciones adicionales seleccionadas por el cliente
  if (sanitizedSelection.additionalFinishings && sanitizedSelection.additionalFinishings.length > 0) {
    for (const fKey of sanitizedSelection.additionalFinishings) {
      const finishingId = adapter.additionalFinishingsResolution?.[fKey];
      if (!finishingId) {
        throw new Error(`Error de configuración: Terminación adicional '${fKey}' no mapeada en el adapter.`);
      }

      if (!availableFinishings.includes(finishingId)) {
        throw new Error(
          `Error de configuración: La terminación '${finishingId}' ('${fKey}') no está disponible en este producto.`
        );
      }

      resolvedFinishingIds.push(finishingId);
    }
  }

  // C3. Procesos requeridos por compatibilidad (ej: HENDIDO_CENTRAL, DOBLADO_DIPTICO, etc.)
  for (const procKey of requiredProcesses) {
    const procFinishingId = adapter.processResolution?.[procKey];
    if (!procFinishingId) {
      throw new Error(`Error de configuración: Proceso de producción '${procKey}' no mapeado en el adapter.`);
    }

    if (!availableFinishings.includes(procFinishingId)) {
      throw new Error(
        `Error de configuración: La operación para el proceso '${procKey}' ('${procFinishingId}') no está disponible en este producto.`
      );
    }

    resolvedFinishingIds.push(procFinishingId);
  }

  return {
    rawMaterialId,
    quantity: sanitizedSelection.quantity!,
    sizeLabel: formatInfo.sizeLabel,
    width: formatInfo.width,
    height: formatInfo.height,
    finishingIds: resolvedFinishingIds,
  };
}

/**
 * Cotización contra un costo real de proveedor de producto terminado.
 *
 * La matriz sigue siendo costo, nunca precio de venta. El margen sale del
 * ProductQuoterConfig del producto, por lo que cambiar el margen maestro
 * actualiza todas las configuraciones que usan esta fuente.
 *
 * Los resolvers son deliberadamente explícitos: si una combinación no tiene
 * costo real cargado, falla y la operación debe pasar a consulta. No se
 * extrapolan precios ni se reutilizan costos de otra combinación.
 */
function roundProviderPrice(price: number) {
  if (price < 100) return Math.ceil(price / 10) * 10;
  const rounded = Math.ceil(price / 100) * 100 - 10;
  return rounded < price ? rounded + 100 : rounded;
}

function quoteProviderFinishedCostSelection(
  configurator: ConfiguratorVersionPayload,
  selection: CommercialSelection,
  quoterConfig?: ProductQuoterConfigInput
): ProductQuoteResult {
  const pricing: any = configurator.pricing;
  const matrix: any = pricing?.providerFinishedCostMatrix;
  const resolver = matrix?.resolver;

  if (!matrix || !resolver) {
    throw new Error('CONSULT_REQUIRED: Esta configuración no tiene un costo real de proveedor conectado.');
  }

  const quantity = Number(selection.quantity || 0);
  if (!quantity) throw new Error('Debe especificar la cantidad.');

  let totalCost = 0;
  const fields = configurator.schema?.fields || {};

  if (resolver.type === 'CARDS_DIGITAL') {
    if (selection.format !== '9x5') {
      throw new Error('CONSULT_REQUIRED: El costo cargado para tarjetas no contempla este formato.');
    }
    if (selection.laminationSides && selection.laminationSides !== 'frente') {
      throw new Error('CONSULT_REQUIRED: La fuente no discrimina el costo de laminado en ambas caras.');
    }
    if (selection.additionalFinishings?.includes('laca_uv_sectorizada')) {
      throw new Error('CONSULT_REQUIRED: No hay costo de proveedor cargado para laca UV sectorizada.');
    }

    const cards = matrix.digitalOndemand?.cards?.[selection.material || ''];
    const row = cards?.quantities?.[String(quantity)]?.[selection.printing || ''];
    const finishKey =
      selection.lamination === 'mate'
        ? 'laminado_mate'
        : selection.lamination === 'brillo'
          ? 'laminado_brillo'
          : selection.lamination === 'sin_laminar'
            ? 'sin_laminar'
            : null;
    if (!row || !finishKey || row[finishKey] === undefined) {
      throw new Error('CONSULT_REQUIRED: No hay costo real cargado para esta combinación de tarjeta.');
    }

    totalCost = Number(row[finishKey]);

    const finishing = matrix.digitalOndemand.finishing || {};
    for (const finish of selection.additionalFinishings || []) {
      if (finish === 'puntas_redondeadas' || finish === 'perforacion') {
        const source = finish === 'puntas_redondeadas'
          ? finishing.puntas_redondeadas
          : finishing.agujereado_3mm;
        const surcharge = source?.[String(quantity)];
        if (surcharge === undefined) {
          throw new Error('CONSULT_REQUIRED: No hay costo real cargado para esta terminación.');
        }
        totalCost += Number(surcharge);
      }
    }
  } else if (resolver.type === 'FLYERS_DIGITAL') {
    if (selection.foldingType !== 'plano') {
      throw new Error('CONSULT_REQUIRED: El costo digital cargado no incluye el proceso de plegado.');
    }
    const source = matrix.digitalOndemand?.fullColor?.[selection.material || '']?.[selection.format || ''];
    const row = source?.[String(quantity)]?.[selection.printing || ''];
    if (row === undefined) {
      throw new Error('CONSULT_REQUIRED: No hay costo real cargado para esta combinación de folleto.');
    }
    totalCost = Number(row);
  } else if (resolver.type === 'STICKERS_CIRCULAR') {
    if (selection.shape !== 'circular') {
      throw new Error('CONSULT_REQUIRED: La fuente cargada corresponde a stickers circulares.');
    }
    if (selection.lamination !== 'laca_uv_brillo') {
      throw new Error('CONSULT_REQUIRED: La tarifa cargada de stickers ya incluye laca UV brillo; no hay costo separado sin laca.');
    }
    const source = matrix.quote?.[selection.material || '']?.[selection.format || '']?.[String(quantity)];
    if (source === undefined) {
      throw new Error('CONSULT_REQUIRED: No hay costo real cargado para esta medida/cantidad de sticker.');
    }
    totalCost = Number(source);
  } else if (resolver.type === 'FOLDERS_DIGITAL') {
    if (selection.material !== 'ilustracion_300g') {
      throw new Error('CONSULT_REQUIRED: No hay costo digital cargado para este material de carpeta.');
    }
    const tiers = matrix.digital_300g?.tiers || [];
    const tier = tiers.find((entry: any) => quantity >= entry.minQty && quantity <= entry.maxQty);
    const prices = tier?.prices?.[selection.printing || ''];
    const key =
      selection.lamination === 'sin_laminar'
        ? 'sin_laminar'
        : selection.lamination === 'laca_uv'
          ? 'laca_uv'
          : selection.lamination === 'opp_brillo'
            ? 'opp_brillo'
            : selection.lamination === 'opp_mate'
              ? 'opp_mate'
              : null;
    if (!tier || !prices || !key || prices[key] === undefined) {
      throw new Error('CONSULT_REQUIRED: No hay costo real cargado para esta combinación de carpeta.');
    }
    const flap = selection.flap === 'impresa' ? Number(tier.flapSurcharge || 0) : 0;
    totalCost = (Number(prices[key]) + flap) * quantity;
  } else {
    throw new Error('CONSULT_REQUIRED: Resolver de costo de proveedor no configurado.');
  }

  const margin = quoterConfig?.profitMargin;
  if (margin === undefined || margin === null) {
    throw new Error('CONSULT_REQUIRED: Falta el margen maestro del producto.');
  }

  const totalPrice = roundProviderPrice(totalCost * (1 + Number(margin) / 100));

  const selectedOptions: Array<{ name: string; value: string }> = [];
  for (const [key, val] of Object.entries(selection)) {
    if (val === undefined || val === null || val === '') continue;
    const fieldDef = fields[key];
    const fieldLabel = fieldDef?.label || key;
    let optionLabel = String(val);
    if (fieldDef?.options && Array.isArray(fieldDef.options)) {
      const matched = fieldDef.options.find((opt: any) => (opt.id ?? opt.value) === val);
      if (matched?.label) optionLabel = matched.label;
    }
    selectedOptions.push({ name: fieldLabel, value: optionLabel });
  }

  const marginPercent = Number(margin);

  return {
    unitPrice: totalPrice / quantity,
    totalPrice,
    totalCost,
    selectedOptions,
    breakdown: {
      materialCost: 0,
      printingCost: 0,
      processCost: 0,
      finishingCost: 0,
      wasteCost: 0,
      productionCost: totalCost,
      marginAmount: totalPrice - totalCost,
      marginPercent,
    },
  };
}

/**
 * Cotización para configuradores con motor de tabla comercial (STICKER_TABLE).
 * Consulta la matriz de precios versionada en ConfiguratorVersion.pricing sin pasar por quoter de producción.
 * No asume ni inventa costos de producción: retorna totalCost = 0 para reflejar que la fuente es un precio de lista.
 */
export function quoteStickerTableSelection(
  configurator: ConfiguratorVersionPayload,
  sanitizedSelection: CommercialSelection
): ProductQuoteResult {
  const pricing = configurator.pricing;
  if (!pricing || !pricing.matrix) {
    throw new Error('Error de configuración: El configurador no posee una matriz de precios definida.');
  }

  const material = sanitizedSelection.material;
  const format = sanitizedSelection.format;
  const quantity = sanitizedSelection.quantity;

  if (!material) throw new Error('Debe seleccionar un material.');
  if (!format) throw new Error('Debe seleccionar una medida.');
  if (!quantity) throw new Error('Debe seleccionar una cantidad.');

  const materialMatrix = pricing.matrix[material];
  if (!materialMatrix) {
    throw new Error(`Material '${material}' no disponible en la matriz de precios.`);
  }

  const formatMatrix = materialMatrix[format];
  if (!formatMatrix) {
    throw new Error(`Medida '${format}' no disponible en la matriz de precios para el material '${material}'.`);
  }

  const basePrice = formatMatrix[String(quantity)] ?? formatMatrix[quantity];
  if (basePrice === undefined || basePrice === null) {
    throw new Error(`Cantidad '${quantity}' no disponible para la medida '${format}'.`);
  }

  // Modificadores de precio (ej: laca UV brillo +15%)
  let totalPrice = Number(basePrice);
  const lamination = sanitizedSelection.lamination;

  if (lamination && lamination !== 'sin_laca') {
    const modifier = pricing.modifiers?.[lamination];
    if (!modifier) {
      throw new Error(`Modificador de terminación '${lamination}' no configurado en pricing.`);
    }
    if (modifier.type === 'PERCENTAGE') {
      const surcharge = Math.round(basePrice * (modifier.value / 100));
      totalPrice = basePrice + surcharge;
    } else if (modifier.type === 'FIXED') {
      totalPrice = basePrice + modifier.value;
    }
  }

  // selectedOptions legibles para UI / checkout
  const fields = configurator.schema?.fields || {};
  const selectedOptions: Array<{ name: string; value: string }> = [];

  for (const [key, val] of Object.entries(sanitizedSelection)) {
    if (val === undefined || val === null || val === '') continue;
    const fieldDef = fields[key];
    const fieldLabel = fieldDef?.label || key;
    let optionLabel = String(val);

    if (fieldDef?.options && Array.isArray(fieldDef.options)) {
      const matchedOpt = fieldDef.options.find((opt: any) => (opt.id ?? opt.value) === val);
      if (matchedOpt?.label) {
        optionLabel = matchedOpt.label;
      }
    }

    selectedOptions.push({ name: fieldLabel, value: optionLabel });
  }

  return {
    unitPrice: totalPrice / quantity,
    totalPrice,
    totalCost: 0,
    selectedOptions,
  };
}

/**
 * Cotización para configuradores con tabla de precio unitario por escala (TIERED_UNIT_TABLE).
 * Resuelve precio unitario por (impresion, terminacion, rango_cantidad) + adicional de solapa.
 * Multiplica por la cantidad exacta solicitada por el cliente.
 * Retorna totalCost = 0 para reflejar precios comerciales oficiales.
 */
export function quoteTieredUnitTableSelection(
  configurator: ConfiguratorVersionPayload,
  sanitizedSelection: CommercialSelection
): ProductQuoteResult {
  const pricing = configurator.pricing;
  if (!pricing || !pricing.tieredUnitTable) {
    throw new Error('Error de configuración: El configurador no posee una tabla tieredUnitTable definida.');
  }

  const { printing, lamination, flap, quantity } = sanitizedSelection;
  if (!printing) throw new Error("Debe seleccionar el tipo de impresión ('printing').");
  if (!lamination) throw new Error("Debe seleccionar la terminación ('lamination').");
  if (!quantity) throw new Error("Debe especificar la cantidad ('quantity').");

  const tiers = pricing.tieredUnitTable.tiers || [];
  const tier = tiers.find((t) => quantity >= t.minQty && quantity <= t.maxQty);
  if (!tier) {
    throw new Error(`Cantidad '${quantity}' fuera de los rangos de producción permitidos.`);
  }

  const printingPrices = tier.prices?.[printing];
  if (!printingPrices) {
    throw new Error(`Impresión '${printing}' no disponible en el tarifario.`);
  }

  const unitBase = printingPrices[lamination];
  if (unitBase === undefined || unitBase === null) {
    throw new Error(`Terminación '${lamination}' no disponible para impresión '${printing}'.`);
  }

  let flapSurcharge = 0;
  if (flap === 'impresa') {
    flapSurcharge = Number(tier.flapSurcharge || 0);
  }

  const finalUnitPrice = unitBase + flapSurcharge;
  const totalPrice = finalUnitPrice * quantity;

  // selectedOptions legibles para UI / checkout
  const fields = configurator.schema?.fields || {};
  const selectedOptions: Array<{ name: string; value: string }> = [];

  for (const [key, val] of Object.entries(sanitizedSelection)) {
    if (val === undefined || val === null || val === '') continue;
    const fieldDef = fields[key];
    const fieldLabel = fieldDef?.label || key;
    let optionLabel = String(val);

    if (fieldDef?.options && Array.isArray(fieldDef.options)) {
      const matchedOpt = fieldDef.options.find((opt: any) => (opt.id ?? opt.value) === val);
      if (matchedOpt?.label) {
        optionLabel = matchedOpt.label;
      }
    }

    selectedOptions.push({ name: fieldLabel, value: optionLabel });
  }

  return {
    unitPrice: finalUnitPrice,
    totalPrice,
    totalCost: 0,
    selectedOptions,
  };
}

/**
 * Pipeline completo de cotización a través de ConfiguratorVersion:
 * 1. Validación UI y compatibilidad.
 * 2. Si el motor es STICKER_TABLE: cotiza directo contra matriz comercial versionada.
 * 3. Si el motor es TIERED_UNIT_TABLE: resuelve unitPrice por escala + accesorios y multiplica por cantidad.
 * 4. Si el motor es PROVIDER_FINISHED_COST: consulta el costo real de producto terminado y aplica el margen maestro.
 * 5. Si el motor es PRODUCT_QUOTER: resuelve adapter y delega a calculateProductQuote (nesting/producción física).
 */
export function quoteConfiguratorSelection(
  configurator: ConfiguratorVersionPayload,
  selection: CommercialSelection,
  quoterConfig?: ProductQuoterConfigInput
): ProductQuoteResult {
  // 1. Validación UI y reglas de compatibilidad
  const { sanitizedSelection, requiredProcesses } = validateCommercialSelection(configurator, selection);

  // 2. Despacho por motor comercial
  if (configurator.pricing?.engine === 'STICKER_TABLE') {
    return quoteStickerTableSelection(configurator, sanitizedSelection);
  }

  if (configurator.pricing?.engine === 'TIERED_UNIT_TABLE') {
    return quoteTieredUnitTableSelection(configurator, sanitizedSelection);
  }

  if (configurator.pricing?.engine === 'PROVIDER_FINISHED_COST') {
    return quoteProviderFinishedCostSelection(configurator, sanitizedSelection, quoterConfig);
  }

  if (!quoterConfig) {
    throw new Error(
      `Error de configuración: Se requiere ProductQuoterConfig para el motor '${configurator.pricing?.engine || 'PRODUCT_QUOTER'}'.`
    );
  }

  // 3. Resolución contra registros reales mediante pricing.adapter
  const quoteSelection = resolveQuoterSelection(configurator, sanitizedSelection, requiredProcesses, quoterConfig);

  // 4. Ejecución en el motor existente de nesting y cálculo
  return calculateProductQuote(quoterConfig, quoteSelection);
}


