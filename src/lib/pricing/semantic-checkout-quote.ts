import { quoteConfiguratorSelection, type CommercialSelection, type ConfiguratorVersionPayload } from './configurator-adapter'
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
  return quoteConfiguratorSelection(configurator, selection as CommercialSelection, quoterConfig)
}

/** Prevent checkout from silently changing the amount the customer just reviewed. */
export function assertQuotedPriceCurrent(productName: string, quotedPrice: number | undefined, currentPrice: number): void {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`No pudimos validar el precio actual de ${productName}. Volvé a cotizar el producto antes de continuar.`)
  }
  if (quotedPrice !== undefined && (!Number.isFinite(quotedPrice) || Math.abs(quotedPrice - currentPrice) > 0.01)) {
    throw new Error(`El precio de ${productName} cambió desde la última cotización. Volvé al producto, revisá el importe actualizado y agregalo nuevamente.`)
  }
}
