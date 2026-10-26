import {
  quoteConfiguratorSelection,
  type CommercialSelection,
  type ConfiguratorVersionPayload,
} from './configurator-adapter'
import { calculateCommercialPrice } from './commercial-pricing-policy'
import type { ProductQuoterConfigInput, ProductQuoteResult } from './product-quoter'

/** Recalculate an active semantic configuration using server-owned pricing policy data. */
export function resolveSemanticCheckoutQuote(
  configurator: ConfiguratorVersionPayload,
  selection: Record<string, string | number | boolean | string[]>,
  quoterConfig?: ProductQuoterConfigInput
): ProductQuoteResult {
  if (!selection || typeof selection !== 'object' || Array.isArray(selection) || Object.keys(selection).length === 0) {
    throw new Error('La configuración está incompleta. Volvé al producto y cotizalo de nuevo.')
  }

  const pricing = configurator.pricing as any
  const requestedProcess = (() => {
    if (selection.productionProcess) return String(selection.productionProcess)
    // Keep the checkout resolver aligned with the public quote endpoint for flyers.
    if (
      pricing?.providerFinishedCostMatrix?.resolver?.type === 'FLYERS_DIGITAL' &&
      selection.foldingType === 'plano' &&
      selection.printing === '4_4'
    ) {
      const offsetCost =
        pricing.providerFinishedCostMatrix.matrix?.[String(selection.material || '')]?.[String(selection.format || '')]?.[String(selection.quantity)]
      if (offsetCost !== undefined) return 'offset'
    }
    return 'digital'
  })()

  const commercialPolicy =
    pricing?.commercialPricingPoliciesByProcessAndMaterialAndPrintingAndQuantity?.[requestedProcess]?.[String(selection.material || '')]?.[String(selection.printing || '')]?.[String(selection.quantity)] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterialAndPrinting?.[requestedProcess]?.[String(selection.material || '')]?.[String(selection.printing || '')] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterialAndQuantity?.[requestedProcess]?.[String(selection.material || '')]?.[String(selection.quantity)] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterial?.[requestedProcess]?.[String(selection.material || '')] ||
    pricing?.commercialPricingPoliciesByProcess?.[requestedProcess] ||
    pricing?.commercialPricingPoliciesByMaterial?.[String(selection.material || '')] ||
    pricing?.commercialPricingPoliciesByShape?.[String(selection.shape || '')] ||
    pricing?.commercialPricingPolicy

  if (
    pricing?.engine === 'PROVIDER_FINISHED_COST' &&
    pricing?.commercialPricingPoliciesByProcess &&
    !commercialPolicy
  ) {
    throw new Error('CONSULT_REQUIRED: Falta una política comercial para el proceso seleccionado.')
  }

  const quote = quoteConfiguratorSelection(configurator, selection as CommercialSelection, quoterConfig)

  // Match the public quote endpoint: derive the displayed total from the active
  // versioned policy instead of trusting a cached or legacy calculated amount.
  if (pricing?.engine === 'PROVIDER_FINISHED_COST' && commercialPolicy) {
    const calculated = calculateCommercialPrice(Number(quote.totalCost), commercialPolicy)
    const quantity = Number(selection.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('La cantidad de la configuración no es válida. Volvé a cotizar el producto.')
    }
    return {
      ...quote,
      unitPrice: calculated.finalPrice / quantity,
      totalPrice: calculated.finalPrice,
      taxTreatment: 'INCLUDED',
      netPrice: calculated.netPrice,
      vatAmount: calculated.vatAmount,
      vatRatePercent: commercialPolicy.vatRatePercent,
      breakdown: quote.breakdown
        ? {
            ...quote.breakdown,
            marginAmount: calculated.grossProfit,
            marginPercent: calculated.grossMarginPercent,
          }
        : quote.breakdown,
    }
  }

  return quote
}

/** Prevent checkout from silently changing the amount the customer just reviewed. */
export function assertQuotedPriceCurrent(productName: string, quotedPrice: number | undefined, currentPrice: number): void {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`No pudimos validar el precio actual de ${productName}. Volvé a cotizar el producto antes de continuar.`)
  }
  if (quotedPrice === undefined || !Number.isFinite(quotedPrice) || Math.abs(quotedPrice - currentPrice) > 0.01) {
    throw new Error(`El precio de ${productName} cambió desde la última cotización o no pudimos verificar el importe que revisaste. Volvé al producto, revisá el importe actualizado y agregalo nuevamente.`)
  }
}
