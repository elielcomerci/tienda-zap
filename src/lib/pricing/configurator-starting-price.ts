import { quoteConfiguratorSelection } from '@/lib/pricing/configurator-adapter'
import { calculateCommercialPrice } from '@/lib/pricing/commercial-pricing-policy'

type ConfiguratorLike = {
  id?: string
  schemaVersion?: string
  schema?: { fields?: Record<string, any> }
  compatibility?: any
  pricing?: any
}

function policyFor(pricing: any, selection: Record<string, any>) {
  let process = selection.productionProcess ? String(selection.productionProcess) : 'digital'
  if (!selection.productionProcess && pricing?.providerFinishedCostMatrix?.resolver?.type === 'FLYERS_DIGITAL' &&
      selection.foldingType === 'plano' && selection.printing === '4_4') {
    const cost = pricing.providerFinishedCostMatrix.matrix?.[selection.material || '']?.[selection.format || '']?.[String(selection.quantity)]
    if (cost !== undefined) process = 'offset'
  }
  return pricing?.commercialPricingPoliciesByProcessAndMaterialAndPrintingAndQuantity?.[process]?.[selection.material || '']?.[selection.printing || '']?.[String(selection.quantity)] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterialAndPrinting?.[process]?.[selection.material || '']?.[selection.printing || ''] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterialAndQuantity?.[process]?.[selection.material || '']?.[String(selection.quantity)] ||
    pricing?.commercialPricingPoliciesByProcessAndMaterial?.[process]?.[selection.material || ''] ||
    pricing?.commercialPricingPoliciesByProcess?.[process] ||
    pricing?.commercialPricingPoliciesByMaterial?.[selection.material || ''] ||
    pricing?.commercialPricingPoliciesByShape?.[selection.shape || ''] ||
    pricing?.commercialPricingPolicy
}

/**
 * Finds the lowest valid, tax-inclusive price from the active commercial
 * configurator. Invalid combinations and matrix cells without real costs are
 * ignored; no legacy Product.price or guessed cost is used.
 */
export function getSemanticStartingPrice(configurator: ConfiguratorLike, quoterConfig?: any): number | null {
  if (!configurator?.schema?.fields || configurator.pricing?.engine !== 'PROVIDER_FINISHED_COST') return null
  const fields = configurator.schema.fields
  let selections: Record<string, any>[] = [{}]
  for (const [key, field] of Object.entries(fields) as Array<[string, any]>) {
    let values: any[]
    if (field.type === 'multiselect') values = [Array.isArray(field.default) ? field.default : []]
    else if (Array.isArray(field.options) && field.options.length) {
      values = field.options.map((option: any) => option.id ?? option.value).filter((value: any) => value !== undefined)
      if (field.default !== undefined && !values.includes(field.default)) values.unshift(field.default)
    } else values = field.default !== undefined ? [field.default] : field.required ? [] : [undefined]
    if (!values.length) return null
    selections = selections.flatMap((selection) => values.map((value) => ({ ...selection, ...(value === undefined ? {} : { [key]: value }) })))
    if (selections.length > 2500) return null
  }

  const prices: number[] = []
  for (const selection of selections) {
    try {
      const quote = quoteConfiguratorSelection(configurator as any, selection, quoterConfig)
      const policy = policyFor(configurator.pricing, selection)
      if (!policy || !Number.isFinite(Number(quote.totalCost)) || Number(quote.totalCost) < 0) continue
      const quantity = Number(selection.quantity || 1)
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      prices.push(calculateCommercialPrice(Number(quote.totalCost), policy).finalPrice)
    } catch {
      // Combinations without a real cost or with incompatible options aren't sellable online.
    }
  }
  return prices.length ? Math.min(...prices) : null
}
