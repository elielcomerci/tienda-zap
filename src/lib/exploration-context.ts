export type ExplorationMode = 'product' | 'situation' | 'rubro'

export type ExplorationContext = {
  mode?: ExplorationMode
  businessTypeSlug?: string
  situationSlug?: string
  needSlug?: string
}

export function normalizeExplorationContext(
  context?: Partial<ExplorationContext> | null
): ExplorationContext {
  return {
    mode: context?.mode === 'product' || context?.mode === 'situation' || context?.mode === 'rubro' ? context.mode : undefined,
    businessTypeSlug: context?.businessTypeSlug?.trim() || undefined,
    situationSlug: context?.situationSlug?.trim() || undefined,
    needSlug: context?.needSlug?.trim() || undefined,
  }
}

export function buildProductsUrl(
  context?: ExplorationContext,
  overrides: Record<string, string | undefined> = {}
) {
  const params = new URLSearchParams()

  if (context?.businessTypeSlug) params.set('rubro', context.businessTypeSlug)
  if (context?.situationSlug) params.set('situacion', context.situationSlug)
  if (context?.needSlug) params.set('necesidad', context.needSlug)

  if (context?.mode) params.set('mode', context.mode)
  else if (context?.situationSlug) params.set('mode', 'situation')
  else if (context?.businessTypeSlug) params.set('mode', 'rubro')

  Object.entries(overrides).forEach(([key, value]) => {
    if (value) params.set(key, value)
    else params.delete(key)
  })

  const query = params.toString()
  return query ? `/productos?${query}` : '/productos'
}

export function buildProductUrl(slug: string, context?: ExplorationContext) {
  const query = new URLSearchParams()

  if (context?.businessTypeSlug) query.set('rubro', context.businessTypeSlug)
  if (context?.situationSlug) query.set('situacion', context.situationSlug)
  if (context?.needSlug) query.set('necesidad', context.needSlug)

  if (context?.mode) query.set('mode', context.mode)
  else if (context?.situationSlug) query.set('mode', 'situation')
  else if (context?.businessTypeSlug) query.set('mode', 'rubro')

  const suffix = query.toString()
  return suffix ? `/productos/${slug}?${suffix}` : `/productos/${slug}`
}
