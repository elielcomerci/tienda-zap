import { quoteConfiguratorSelection } from '@/lib/pricing/configurator-adapter'

type ConfiguratorLike = {
  id?: string
  schemaVersion?: string
  schema?: { fields?: Record<string, any> }
  compatibility?: any
  pricing?: any
}

/**
 * Finds the lowest valid commercial price from the active configurator.
 * The quote adapter is the source of truth for each engine: provider-cost
 * engines return a calculated commercial price, while table engines return
 * their versioned list price. Never reinterpret totalCost as a sale price.
 */
export function getSemanticStartingPrice(configurator: ConfiguratorLike, quoterConfig?: any): number | null {
  if (!configurator?.schema?.fields || !configurator.pricing?.engine) return null

  const fields = configurator.schema.fields
  let selections: Record<string, any>[] = [{}]

  for (const [key, field] of Object.entries(fields) as Array<[string, any]>) {
    let values: any[]

    if (field.type === 'multiselect') {
      values = [Array.isArray(field.default) ? field.default : []]
    } else if (Array.isArray(field.options) && field.options.length) {
      if (field.type === 'quantity_selector') {
        values = field.options.map((option: any) => option.value).filter((value: any) => value !== undefined)
      } else if (field.type === 'select') {
        values = field.options.map((option: any) => option.id).filter((value: any) => value !== undefined)
      } else {
        values = field.options.map((option: any) => option.id ?? option.value).filter((value: any) => value !== undefined)
      }
      if (field.default !== undefined && !values.includes(field.default)) values.unshift(field.default)
    } else {
      values = field.default !== undefined ? [field.default] : field.required ? [] : [undefined]
    }

    if (!values.length) return null
    selections = selections.flatMap((selection) =>
      values.map((value) => ({ ...selection, ...(value === undefined ? {} : { [key]: value }) }))
    )
    if (selections.length > 2500) return null
  }

  const prices: number[] = []
  for (const selection of selections) {
    try {
      const quote = quoteConfiguratorSelection(configurator as any, selection, quoterConfig)
      const price = Number(quote.totalPrice)
      if (Number.isFinite(price) && price > 0) prices.push(price)
    } catch {
      // Combinations without a real cost or with incompatible options aren't sellable online.
    }
  }

  return prices.length ? Math.min(...prices) : null
}
