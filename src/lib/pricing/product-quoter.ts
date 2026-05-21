import { calculateNesting, calculateQuote, type FinishingCost } from './nesting'

export type ProductQuoterMaterial = {
  rawMaterial: {
    id: string
    name: string
    width: number
    height: number
    unit: string
    tiers: Array<{
      minQty: number
      maxQty: number | null
      unitPrice: number
    }>
  }
}

export type ProductQuoterFinishing = {
  finishing: {
    id: string
    name: string
    costType: 'FIXED_SETUP' | 'PER_SHEET' | 'PER_UNIT'
    tiers: Array<{
      minQty: number
      maxQty: number | null
      unitPrice: number
    }>
  }
}

export type ProductQuoterSizePreset = {
  label: string
  width: number
  height: number
}

export type ProductQuoterConfigInput = {
  pricingMode: string
  itemWidth: number | null
  itemHeight: number | null
  margin: number
  bleed: number
  profitMargin: number
  minProfitMargin: number | null
  maxProfitMargin: number | null
  allowCustomSize: boolean
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  rawMaterial?: ProductQuoterMaterial['rawMaterial'] | null
  allowedMaterials: ProductQuoterMaterial[]
  finishings: ProductQuoterFinishing[]
  sizePresets: ProductQuoterSizePreset[]
  quantityPresets: Array<{ quantity: number }>
}

export type ProductQuoteSelection = {
  rawMaterialId: string
  quantity: number
  sizeLabel?: string
  width?: number
  height?: number
  finishingIds?: string[]
}

export type ProductQuoteResult = {
  unitPrice: number
  totalPrice: number
  totalCost: number
  selectedOptions: Array<{ name: string; value: string }>
}

function roundPsychological(price: number) {
  if (price < 100) return Math.ceil(price / 10) * 10
  const rounded = Math.ceil(price / 100) * 100 - 10
  return rounded < price ? rounded + 100 : rounded
}

function getTierPrice(
  tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>,
  qty: number
) {
  const tier = tiers.find((entry) => qty >= entry.minQty && (!entry.maxQty || qty <= entry.maxQty))
  return tier ? tier.unitPrice : tiers[tiers.length - 1]?.unitPrice || 0
}

function getQuoteMargin(config: ProductQuoterConfigInput, quantity: number) {
  const quantities = config.quantityPresets.map((preset) => preset.quantity).filter((value) => value > 0)
  const minQty = quantities.length > 0 ? Math.min(...quantities) : quantity
  const maxQty = quantities.length > 0 ? Math.max(...quantities) : quantity

  if (config.minProfitMargin === null || config.maxProfitMargin === null || minQty === maxQty) {
    return config.profitMargin
  }

  const progress = Math.log(quantity / minQty) / Math.log(maxQty / minQty)
  return config.maxProfitMargin - progress * (config.maxProfitMargin - config.minProfitMargin)
}

function resolveSize(config: ProductQuoterConfigInput, selection: ProductQuoteSelection) {
  if (selection.sizeLabel) {
    const preset = config.sizePresets.find((entry) => entry.label === selection.sizeLabel)
    if (preset) return preset
  }

  if (config.allowCustomSize && selection.width && selection.height) {
    if (config.minWidth !== null && selection.width < config.minWidth) throw new Error('Ancho fuera de rango.')
    if (config.maxWidth !== null && selection.width > config.maxWidth) throw new Error('Ancho fuera de rango.')
    if (config.minHeight !== null && selection.height < config.minHeight) throw new Error('Alto fuera de rango.')
    if (config.maxHeight !== null && selection.height > config.maxHeight) throw new Error('Alto fuera de rango.')
    return { label: `${selection.width}x${selection.height} cm`, width: selection.width, height: selection.height }
  }

  if (config.itemWidth && config.itemHeight) {
    return { label: `${config.itemWidth}x${config.itemHeight} cm`, width: config.itemWidth, height: config.itemHeight }
  }

  throw new Error('Falta seleccionar una medida valida.')
}

export function getQuoterMaterials(config: ProductQuoterConfigInput) {
  const materials = config.allowedMaterials.map((entry) => entry.rawMaterial)
  if (materials.length > 0) return materials
  return config.rawMaterial ? [config.rawMaterial] : []
}

export function calculateProductQuote(
  config: ProductQuoterConfigInput,
  selection: ProductQuoteSelection
): ProductQuoteResult {
  const rawMaterial = getQuoterMaterials(config).find((material) => material.id === selection.rawMaterialId)
  if (!rawMaterial) throw new Error('Material no disponible para este producto.')

  if (!config.quantityPresets.some((preset) => preset.quantity === selection.quantity)) {
    throw new Error('Cantidad no disponible para este producto.')
  }

  const size = resolveSize(config, selection)
  const finishings = config.finishings
    .filter((entry) => selection.finishingIds?.includes(entry.finishing.id))
    .map((entry) => entry.finishing)

  let totalCost = 0
  let totalPrice = 0

  if (config.pricingMode === 'AREA_M2') {
    const area = Math.max(0.01, (size.width * size.height) / 10000)
    const materialCost = area * getTierPrice(rawMaterial.tiers, Math.ceil(area))
    const finishingCost = finishings.reduce((sum, finishing) => {
      const unit = getTierPrice(finishing.tiers, Math.ceil(area))
      return sum + unit * (finishing.costType === 'PER_UNIT' ? selection.quantity : area)
    }, 0)
    totalCost = (materialCost + finishingCost) * selection.quantity
    totalPrice = totalCost * (1 + getQuoteMargin(config, selection.quantity) / 100)
  } else {
    const nesting = calculateNesting({
      sheetWidth: rawMaterial.width,
      sheetHeight: rawMaterial.height,
      itemWidth: size.width,
      itemHeight: size.height,
      margin: config.margin,
      bleed: config.bleed,
    })
    const sheetsNeeded = Math.ceil(selection.quantity / nesting.itemsPerSheet)
    const quote = calculateQuote({
      quantity: selection.quantity,
      itemsPerSheet: nesting.itemsPerSheet,
      rawMaterialUnitPrice: getTierPrice(rawMaterial.tiers, sheetsNeeded),
      finishings: finishings.map((finishing): FinishingCost => ({
        costType: finishing.costType,
        tiers: finishing.tiers,
      })),
      profitMarginPercent: getQuoteMargin(config, selection.quantity),
    })
    totalCost = quote.totalCost
    totalPrice = quote.totalPrice
  }

  const roundedTotalPrice = roundPsychological(totalPrice)
  const selectedOptions = [
    { name: 'Material', value: rawMaterial.name },
    { name: 'Medida', value: size.label },
    { name: 'Cantidad', value: String(selection.quantity) },
    {
      name: 'Terminaciones',
      value: finishings.length > 0 ? finishings.map((finishing) => finishing.name).join(' + ') : 'Sin terminaciones',
    },
  ]

  return {
    unitPrice: roundedTotalPrice / selection.quantity,
    totalPrice: roundedTotalPrice,
    totalCost,
    selectedOptions,
  }
}
