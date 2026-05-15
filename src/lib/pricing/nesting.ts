/**
 * Funciones de cálculo para el Cotizador Automático
 */

export interface NestingParams {
  sheetWidth: number
  sheetHeight: number
  itemWidth: number
  itemHeight: number
  margin: number
  bleed: number
}

/**
 * Calcula cuántas piezas entran en un pliego, evaluando tanto la 
 * orientación original como rotada 90 grados para encontrar la óptima.
 * Las piezas se separan por un espacio igual a "bleed * 2" (demasía de cada lado)
 * más un margen global de agarre "margin" alrededor de la hoja.
 */
export function calculateNesting({
  sheetWidth,
  sheetHeight,
  itemWidth,
  itemHeight,
  margin,
  bleed,
}: NestingParams): { itemsPerSheet: number; isRotated: boolean } {
  // Ancho y alto utilizable del pliego (descontando el margen general)
  const usableWidth = sheetWidth - margin * 2
  const usableHeight = sheetHeight - margin * 2

  if (usableWidth <= 0 || usableHeight <= 0) {
    return { itemsPerSheet: 0, isRotated: false }
  }

  // Ancho y alto real de la pieza incluyendo la demasía (bleed de ambos lados)
  const pieceTotalWidth = itemWidth + bleed * 2
  const pieceTotalHeight = itemHeight + bleed * 2

  if (pieceTotalWidth > usableWidth && pieceTotalHeight > usableHeight) {
    return { itemsPerSheet: 0, isRotated: false }
  }

  // Calculamos cantidad sin rotar
  const colsNormal = Math.floor(usableWidth / pieceTotalWidth)
  const rowsNormal = Math.floor(usableHeight / pieceTotalHeight)
  const totalNormal = colsNormal * rowsNormal

  // Calculamos cantidad rotando 90 grados
  const colsRotated = Math.floor(usableWidth / pieceTotalHeight)
  const rowsRotated = Math.floor(usableHeight / pieceTotalWidth)
  const totalRotated = colsRotated * rowsRotated

  if (totalRotated > totalNormal) {
    return { itemsPerSheet: totalRotated, isRotated: true }
  }

  return { itemsPerSheet: totalNormal, isRotated: false }
}

export interface FinishingTier {
  minQty: number
  maxQty: number | null
  unitPrice: number
}

export interface FinishingCost {
  costType: 'FIXED_SETUP' | 'PER_SHEET' | 'PER_UNIT'
  tiers: FinishingTier[]
}

export interface QuoteParams {
  quantity: number
  itemsPerSheet: number
  rawMaterialUnitPrice: number
  finishings: FinishingCost[]
  profitMarginPercent: number
}

/**
 * Calcula el costo unitario real y el precio final de venta.
 */
export function calculateQuote({
  quantity,
  itemsPerSheet,
  rawMaterialUnitPrice,
  finishings,
  profitMarginPercent,
}: QuoteParams): {
  sheetsNeeded: number
  unitCost: number
  totalCost: number
  unitPrice: number
  totalPrice: number
} {
  if (itemsPerSheet <= 0) {
    throw new Error('La pieza es demasiado grande para el material o no entra ninguna.')
  }

  // Cantidad de pliegos necesarios (redondeo hacia arriba, no se compra "medio" pliego)
  const sheetsNeeded = Math.ceil(quantity / itemsPerSheet)

  // Costo base del material para la cantidad de pliegos
  const materialCost = sheetsNeeded * rawMaterialUnitPrice

  // Costo de terminaciones
  let finishingsCost = 0
  for (const f of finishings) {
    // Determine which quantity to use for tier matching
    const qtyToMatch = f.costType === 'PER_SHEET' ? sheetsNeeded : quantity
    
    // Find matching tier
    const tier = f.tiers.find(t => 
      qtyToMatch >= t.minQty && (!t.maxQty || qtyToMatch <= t.maxQty)
    )
    const costUnit = tier ? tier.unitPrice : (f.tiers[f.tiers.length - 1]?.unitPrice || 0)

    if (f.costType === 'FIXED_SETUP') {
      finishingsCost += costUnit // Costo fijo único por el lote
    } else if (f.costType === 'PER_SHEET') {
      finishingsCost += costUnit * sheetsNeeded
    } else if (f.costType === 'PER_UNIT') {
      finishingsCost += costUnit * quantity
    }
  }

  const totalCost = materialCost + finishingsCost
  const unitCost = totalCost / quantity

  // Aplicamos el margen de ganancia
  // Si margin es 150, significa Costo + 150% = Costo * 2.5
  const marginMultiplier = 1 + profitMarginPercent / 100
  const totalPrice = totalCost * marginMultiplier
  const unitPrice = totalPrice / quantity

  return {
    sheetsNeeded,
    unitCost,
    totalCost,
    unitPrice,
    totalPrice,
  }
}
