export type CommercialPricingPolicy = {
  version: 1
  mode: 'MARGIN' | 'MARKUP'
  percentage: number
  vatRatePercent: number
}

export type CommercialPriceCalculation = {
  cost: number
  netPrice: number
  vatAmount: number
  finalPrice: number
  grossProfit: number
  grossMarginPercent: number
  markupPercent: number
}

export function validateCommercialPricingPolicy(value: unknown): CommercialPricingPolicy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('La política de precios no es válida.')
  }
  const input = value as Record<string, unknown>
  if (input.version !== 1 || (input.mode !== 'MARGIN' && input.mode !== 'MARKUP')) {
    throw new Error('La política de precios tiene una versión o un modo desconocido.')
  }
  if (typeof input.percentage !== 'number' || typeof input.vatRatePercent !== 'number') {
    throw new Error('El porcentaje y la tasa de IVA deben ser valores numéricos.')
  }
  const percentage = input.percentage
  const vatRatePercent = input.vatRatePercent
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 1000) {
    throw new Error('El porcentaje debe estar entre 0 y 1.000.')
  }
  if (input.mode === 'MARGIN' && percentage >= 100) {
    throw new Error('El margen objetivo debe ser menor que 100%.')
  }
  if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) {
    throw new Error('La tasa de IVA debe estar entre 0 y 100%.')
  }
  return { version: 1, mode: input.mode, percentage, vatRatePercent }
}

export function roundCommercialPrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) throw new Error('El precio calculado no es válido.')
  if (price < 100) return Math.ceil(price / 10) * 10
  const rounded = Math.ceil(price / 100) * 100 - 10
  return rounded < price ? rounded + 100 : rounded
}

export function calculatePriceAtNetAmount(
  cost: number,
  requestedNetPrice: number,
  vatRatePercent: number,
): CommercialPriceCalculation {
  if (!Number.isFinite(cost) || cost < 0) throw new Error('El costo debe ser un número válido igual o mayor que cero.')
  if (!Number.isFinite(requestedNetPrice) || requestedNetPrice < 0) throw new Error('El precio neto debe ser un número válido igual o mayor que cero.')
  if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) throw new Error('La tasa de IVA debe estar entre 0 y 100%.')

  const finalPrice = roundCommercialPrice(requestedNetPrice * (1 + vatRatePercent / 100))
  const netPrice = finalPrice / (1 + vatRatePercent / 100)
  const vatAmount = finalPrice - netPrice
  const grossProfit = netPrice - cost
  return {
    cost,
    netPrice,
    vatAmount,
    finalPrice,
    grossProfit,
    grossMarginPercent: netPrice > 0 ? (grossProfit / netPrice) * 100 : 0,
    markupPercent: cost > 0 ? (grossProfit / cost) * 100 : 0,
  }
}

export function calculateCommercialPrice(
  cost: number,
  policyInput: CommercialPricingPolicy,
): CommercialPriceCalculation {
  const policy = validateCommercialPricingPolicy(policyInput)
  if (!Number.isFinite(cost) || cost < 0) throw new Error('El costo debe ser un número válido igual o mayor que cero.')

  const targetNetPrice = policy.mode === 'MARGIN'
    ? (policy.percentage === 0 ? cost : cost / (1 - policy.percentage / 100))
    : cost * (1 + policy.percentage / 100)
  const unroundedFinalPrice = targetNetPrice * (1 + policy.vatRatePercent / 100)
  const finalPrice = roundCommercialPrice(unroundedFinalPrice)
  const netPrice = finalPrice / (1 + policy.vatRatePercent / 100)
  const vatAmount = finalPrice - netPrice
  const grossProfit = netPrice - cost

  return {
    cost,
    netPrice,
    vatAmount,
    finalPrice,
    grossProfit,
    grossMarginPercent: netPrice > 0 ? (grossProfit / netPrice) * 100 : 0,
    markupPercent: cost > 0 ? (grossProfit / cost) * 100 : 0,
  }
}

export function marginFromMarkup(markupPercent: number): number {
  if (!Number.isFinite(markupPercent) || markupPercent < 0) return 0
  return (markupPercent / (100 + markupPercent)) * 100
}

export function markupFromMargin(marginPercent: number): number {
  if (!Number.isFinite(marginPercent) || marginPercent < 0 || marginPercent >= 100) {
    throw new Error('El margen debe ser mayor o igual a 0 y menor que 100%.')
  }
  return (marginPercent / (100 - marginPercent)) * 100
}
