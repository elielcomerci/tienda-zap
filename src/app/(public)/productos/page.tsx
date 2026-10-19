import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Search } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { getPublicCategories } from '@/lib/categories'
import { getPublicSituationBySlug, getPublicSituations } from '@/lib/discovery'
import { getPublicBusinessTypes } from '@/lib/business-types'
import AddToCartButton from '@/components/public/AddToCartButton'
import CatalogSidebar from '@/components/public/CatalogSidebar'
import CatalogOrientationFilters from '@/components/public/CatalogOrientationFilters'
import IntentionHero from '@/components/public/IntentionHero'
import NeedsSection from '@/components/public/NeedsSection'
import ProductRelevanceItem from '@/components/public/ProductRelevanceItem'
import LiveContextSummary from '@/components/public/LiveContextSummary'
import ProductImagePlaceholder from '@/components/public/ProductImagePlaceholder'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { isDevelopment, isConsultationOnly } from '@/lib/catalog-domain'
import { buildProductUrl, buildProductsUrl, type ExplorationContext } from '@/lib/exploration-context'

const BUSINESS_CONTEXT: Record<string, string> = {
  gastronomia: 'Más pedidos, una propuesta que se destaque y una experiencia que invite a volver.',
  'moda-showrooms': 'Una marca sólida conecta producto, espacio, comunicación y experiencia.',
  inmobiliarias: 'Más propiedades, mejores consultas y una presencia que transmita confianza.',
  'belleza-salud': 'Una marca, un espacio y una agenda alineados con la experiencia que querés ofrecer.',
  'comercios-retail': 'Una propuesta clara, un local que invite a entrar y una marca fácil de reconocer.',
  'eventos-experiencias': 'Convocatoria, contactos y una experiencia coherente en cada punto de encuentro.',
  wellness: 'Una propuesta visible, más alumnos y una agenda que puedas sostener.',
}

const BUSINESS_SITUATION_PRIORITY: Record<string, string[]> = {
  gastronomia: ['estoy-por-abrir', 'quiero-conseguir-mas-pedidos', 'quiero-vender-mas-en-el-local', 'quiero-que-mis-clientes-vuelvan', 'quiero-ordenar-mi-negocio'],
  'moda-showrooms': ['estoy-por-abrir', 'quiero-vender-mas-en-el-local', 'quiero-vender-online', 'quiero-ordenar-mi-negocio', 'quiero-renovar-la-marca-o-el-espacio'],
  inmobiliarias: ['estoy-abriendo-o-renovando-la-inmobiliaria', 'quiero-captar-propiedades', 'quiero-conseguir-mas-consultas', 'quiero-transmitir-mas-confianza', 'quiero-ordenar-mi-negocio'],
  'belleza-salud': ['estoy-por-abrir', 'quiero-llenar-la-agenda', 'quiero-que-mis-clientes-vuelvan', 'quiero-ordenar-mi-negocio', 'quiero-que-mi-marca-se-vea-mejor'],
  'comercios-retail': ['estoy-por-abrir', 'quiero-que-me-encuentren', 'quiero-vender-mas', 'quiero-ordenar-mi-negocio', 'quiero-renovar-el-local'],
  'eventos-experiencias': ['tengo-un-evento', 'quiero-atraer-gente-al-evento-o-stand', 'quiero-generar-contactos', 'quiero-ordenar-mi-negocio'],
  wellness: ['estoy-por-abrir', 'quiero-conseguir-alumnos', 'quiero-llenar-la-agenda', 'quiero-ordenar-mi-negocio', 'quiero-mejorar-mi-espacio'],
}

function getBusinessSituations<T extends { slug: string }>(businessTypeSlug: string | undefined, situations: T[]) {
  if (!businessTypeSlug) return situations
  const priority = BUSINESS_SITUATION_PRIORITY[businessTypeSlug]
  if (!priority) return situations
  const rank = new Map(priority.map((slug, index) => [slug, index]))
  return [...situations]
    .sort((a, b) => (rank.get(a.slug) ?? priority.length) - (rank.get(b.slug) ?? priority.length))
    .slice(0, priority.length)
}


export const metadata = {
  title: 'Productos y desarrollos | Tienda ZAP',
  description: 'Productos y desarrollos de ZAP para negocios.',
  alternates: {
    canonical: '/productos',
  },
  openGraph: {
    title: 'Productos y desarrollos | Tienda ZAP',
    description: 'Productos y desarrollos de ZAP para negocios.',
    url: '/productos',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string
    q?: string
    mode?: 'product' | 'objective' | 'situation' | 'combo' | 'rubro'
    intent?: string
    situacion?: string
    necesidad?: string
    rubro?: string
    tipo?: 'cosa' | 'desarrollo'
  }>
}) {
  const { cat, q, mode: requestedMode, intent, situacion, necesidad, rubro, tipo } = await searchParams

  // Legacy public entry: Packs/Combos no longer exist as a public layer.
  // Keep old links working by sending them into the real Solutions discovery.
  if (requestedMode === 'combo') {
    redirect('/productos')
  }

  if (requestedMode === 'rubro') {
    const params = new URLSearchParams({ mode: 'product' })
    if (rubro) params.set('rubro', rubro)
    if (cat) params.set('cat', cat)
    if (q) params.set('q', q)
    if (tipo) params.set('tipo', tipo)
    if (situacion || intent) params.set('situacion', situacion || intent || '')
    if (necesidad) params.set('necesidad', necesidad)
    redirect(`/productos?${params.toString()}`)
  }

  // Keep the legacy mode in the type for downstream compatibility branches.
  const mode = requestedMode as 'product' | 'objective' | 'situation' | 'combo' | 'rubro' | undefined
  const isSituationMode = mode === 'objective' || mode === 'situation'
  const situationSlug = situacion || intent
  
  const [situations, selectedSituation, businessTypes] = await Promise.all([
    getPublicSituations(rubro),
    getPublicSituationBySlug(situationSlug, rubro),
    getPublicBusinessTypes(),
  ])
  const selectedBusinessType = rubro ? businessTypes.find((businessType) => businessType.slug === rubro) : undefined

  // A saved/shared situation may no longer apply to the selected business type.
  // Remove only the invalid exploration fields and preserve ordinary catalog filters.
  if (situationSlug && !selectedSituation) {
    const params = new URLSearchParams()
    if (requestedMode) params.set('mode', requestedMode)
    if (rubro) params.set('rubro', rubro)
    if (cat) params.set('cat', cat)
    if (q) params.set('q', q)
    if (tipo) params.set('tipo', tipo)
    const suffix = params.toString()
    redirect(suffix ? `/productos?${suffix}` : '/productos')
  }

  const businessSituations = getBusinessSituations(rubro, situations)
  const [products, categories] = await Promise.all([
    getProducts(
      isSituationMode ? undefined : cat,
      q,
      {
        // The URL may retain a previous choice as exploration context.
        // It becomes a filter only when its corresponding mode is active.
        // The editorial banner guides discovery, but never replaces or narrows the catalog.
        // Use the selected context to rank relevant products first, keeping every active
        // product available underneath the banner.
        rankContext: (rubro || selectedSituation) ? {
          businessTypeSlug: rubro,
          situationSlug: selectedSituation?.slug,
          needSlug: selectedSituation?.needs.some((need) => need.slug === necesidad) ? necesidad : undefined,
          situationPriority: rubro ? BUSINESS_SITUATION_PRIORITY[rubro] : undefined,
        } : undefined,
        catalogType: mode === 'product' ? (tipo === 'cosa' ? 'COSA' : tipo === 'desarrollo' ? 'DESARROLLO' : undefined) : undefined,
      }
    ), 
    getPublicCategories()
  ])

  // Guided discovery now follows a single path:
  // Situación → Necesidad → OfertaMatrix → next step.
  // The old multi-step situation prototype is no longer part of the primary flow.
  const selectedNeed = selectedSituation?.needs.find((need) => need.slug === necesidad)
  const explorationContext: ExplorationContext = {
    mode: isSituationMode ? 'situation' : mode === 'rubro' ? 'rubro' : mode === 'product' ? 'product' : undefined,
    businessTypeSlug: rubro,
    situationSlug: selectedSituation?.slug,
    needSlug: selectedNeed?.slug,
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        {!isSituationMode && (
          <section className="mb-8 flex flex-col gap-3 border-b border-gray-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {mode === 'rubro'
                  ? selectedBusinessType?.name || '¿En qué rubro trabajás?'
                  : tipo === 'desarrollo'
                    ? 'Desarrollos ZAP'
                    : tipo === 'cosa'
                      ? 'Productos ZAP'
                      : 'Productos y desarrollos'}
              </h1>
              {(mode === 'rubro' && selectedBusinessType || tipo === 'desarrollo' || tipo === 'cosa') && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  {mode === 'rubro' && selectedBusinessType
                    ? BUSINESS_CONTEXT[selectedBusinessType.slug]
                    : tipo === 'desarrollo'
                      ? 'Soluciones a medida para tu negocio.'
                      : 'Productos para elegir, configurar o comprar.'}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>
                {mode === 'rubro'
                  ? selectedBusinessType
                    ? `${businessSituations.length} ${businessSituations.length === 1 ? 'situación' : 'situaciones'}`
                    : `${businessTypes.length} ${businessTypes.length === 1 ? 'rubro' : 'rubros'}`
                  : `${products.length} ${products.length === 1 ? 'opción' : 'opciones'}`}
              </span>
              {q?.trim() && (
                <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
                  Búsqueda: “{q.trim()}”
                </span>
              )}
            </div>
          </section>
        )}

        {!isSituationMode && mode !== 'rubro' && (
          <form action="/productos" method="GET" role="search" className="mb-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm focus-within:border-[#ED164F]/50">
            {tipo && <input type="hidden" name="tipo" value={tipo} />}
            {cat && <input type="hidden" name="cat" value={cat} />}
            {rubro && <input type="hidden" name="rubro" value={rubro} />}
            <Search size={19} className="ml-2 shrink-0 text-gray-400" aria-hidden="true" />
            <input type="search" name="q" defaultValue={q || ''} placeholder="Buscar productos y desarrollos" aria-label="Buscar productos y desarrollos" className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0" />
            <button type="submit" className="shrink-0 rounded-xl bg-[#ED164F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C2103F]">Buscar</button>
            {q?.trim() && <Link href={buildProductsUrl({ mode: 'product', businessTypeSlug: rubro }, { q: undefined, cat, tipo })} className="px-2 text-sm font-medium text-gray-500 hover:text-gray-900">Limpiar</Link>}
          </form>
        )}

        <div className={`mt-8 ${isSituationMode ? 'mx-auto max-w-6xl' : 'grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]'}`}>
          {!isSituationMode && (
            <CatalogSidebar 
              categories={categories}
              intentions={situations}
              businessTypes={businessTypes}
              cat={cat} 
              mode={mode} 
              intent={intent} 
              situation={situacion}
              businessType={rubro}
              catalogType={tipo}
            />
          )}

          <div className="space-y-8 min-w-0">
            {!isSituationMode && mode !== 'rubro' && (
              <LiveContextSummary businessTypes={businessTypes} situations={situations} />
            )}
            {!isSituationMode && mode !== 'rubro' && (
              <CatalogOrientationFilters
                businessTypes={businessTypes}
                situations={situations}
                businessTypeSlug={rubro}
                situationSlug={selectedSituation?.slug}
                needSlug={selectedNeed?.slug}
                category={cat}
                query={q}
                catalogType={tipo}
              />
            )}
            {isSituationMode && !selectedSituation && (
              <section className="rounded-[30px] bg-white/55 px-1 py-1 sm:px-2">
                <div className="mb-5">
                  <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950">
                    ¿Qué querés resolver?
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {businessSituations.map((situation) => (
                    <Link
                      key={situation.id}
                      href={buildProductsUrl(
                        {
                          mode: 'situation',
                          businessTypeSlug: rubro,
                        },
                        { situacion: situation.slug, necesidad: undefined }
                      )}
                      className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/40"
                    >
                      <div className="flex gap-3">
                        {situation.icon ? <span className="shrink-0 text-lg">{situation.icon}</span> : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900">{situation.name}</p>
                          {situation.description ? (
                            <p className="mt-1 text-xs leading-5 text-gray-600">{situation.description}</p>
                          ) : null}
                        </div>
                        <ArrowRight size={16} className="mt-0.5 shrink-0 text-[#ED164F]" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                  {rubro ? (
                    <Link
                      href={buildProductsUrl({ mode: 'rubro', businessTypeSlug: rubro })}
                      className="text-sm font-semibold text-gray-600 hover:text-[#ED164F]"
                    >
                      ← Volver al rubro
                    </Link>
                  ) : <span />}
                  <Link
                    href={buildProductsUrl({ mode: 'product', businessTypeSlug: rubro })}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]"
                  >
                    Prefiero explorar todos los productos <ArrowRight size={15} />
                  </Link>
                </div>
              </section>
            )}

            {selectedBusinessType && mode === 'rubro' && !selectedSituation && (
              <section className="rounded-[30px] bg-white/55 px-1 py-1 sm:px-2">
                <div className="mb-5">
                  <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950">¿Qué querés resolver?</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {businessSituations.map((situation) => (
                    <Link
                      key={situation.id}
                      href={`/productos?mode=situation&rubro=${encodeURIComponent(rubro || '')}&situacion=${encodeURIComponent(situation.slug)}`}
                      className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/40"
                    >
                      <div className="flex gap-3">
                        {situation.icon ? <span className="shrink-0 text-lg">{situation.icon}</span> : null}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900">{situation.name}</p>
                          {situation.description ? <p className="mt-1 text-xs leading-5 text-gray-600">{situation.description}</p> : null}
                        </div>
                        <ArrowRight size={16} className="mt-0.5 shrink-0 text-[#ED164F]" />
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <Link href={`/productos?mode=situation&rubro=${encodeURIComponent(rubro || '')}`} className="text-sm font-semibold text-gray-600 hover:text-[#ED164F]">
                      Ver todas las situaciones →
                    </Link>
                    <Link href={`/productos?mode=rubro&rubro=${encodeURIComponent(rubro || '')}`} className="text-sm font-semibold text-gray-700 hover:text-[#ED164F]">
                      Ver todo lo que hacemos para {selectedBusinessType.name} →
                    </Link>
                  </div>
                  <Link href={`/productos?mode=product&rubro=${encodeURIComponent(rubro || '')}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]">
                    Explorar todos los productos <ArrowRight size={15} />
                  </Link>
                </div>
              </section>
            )}

            {selectedSituation && isSituationMode && (
              <>
                <div className="px-0.5 sm:px-1">
                  <Link
                    href={rubro ? `/productos?mode=rubro&rubro=${encodeURIComponent(rubro)}` : '/productos'}
                    className="text-sm font-semibold text-gray-500 hover:text-[#C2103F]"
                  >
                    ← Cambiar contexto
                  </Link>
                </div>
                {selectedNeed ? (
                  <section className="border-b border-gray-100 pb-4">
                    <p className="mb-2 text-xs font-medium text-gray-500">
                      {[selectedBusinessType?.name, selectedSituation.name].filter(Boolean).join(' · ')}
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                      {selectedNeed.name}
                    </h1>
                  </section>
                ) : (
                  <IntentionHero intention={selectedSituation} businessTypeName={selectedBusinessType?.name} />
                )}
                <NeedsSection situation={selectedSituation} businessTypeSlug={rubro} businessTypeName={selectedBusinessType?.name} selectedNeedSlug={necesidad} />

              </>
            )}

            {mode !== 'rubro' && (
              <div id="catalogo" className="scroll-mt-24">
              {isSituationMode && (
                <div className="mb-5 flex items-end justify-between gap-3 border-b border-gray-100 pb-3">
                  <h2 className="text-lg font-semibold tracking-tight text-gray-950">Catálogo completo</h2>
                  <span className="text-sm text-gray-500">{products.length} {products.length === 1 ? 'opción' : 'opciones'}</span>
                </div>
              )}
              {products.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Sin resultados
                </p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">
                  No encontramos productos con este filtro.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
                  Probá otra categoría, quitá la búsqueda actual o volvé al catálogo completo.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/productos" className="btn-primary">
                    Ver todo el catálogo <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const development = isDevelopment(product)
                  const categoryLabel = product.categoryLinks?.find((link) => link.category.slug === cat)?.category.name || product.categoryLinks?.[0]?.category.name || (development ? 'Desarrollo ZAP' : undefined)
                  const hasVariants = Boolean(product.variants && product.variants.length > 0)
                  const requiresConfiguration = product.modality === 'CONFIGURABLE' || hasVariants || Boolean(product.quoterConfig)
                  // Active semantic configurators use their own commercial price engine.
                  // Never show a legacy product.price as a price source for consultation-only
                  // products or configurable products without a real variant/quoter source.
                  const hasActiveSemanticConfigurator = product.configuratorVersions?.some((version) => version.status === 'ACTIVE')
                  const hasExplicitPriceSource =
                    product.modality === 'DIRECTO' ||
                    hasVariants ||
                    Boolean(product.quoterConfig)
                  const displayPrice =
                    hasActiveSemanticConfigurator || !hasExplicitPriceSource
                      ? null
                      : getProductDisplayPrice(product)
                  const isPurchasable = displayPrice !== null && product.modality === 'DIRECTO'
                  const requiresConversation = isDevelopment(product) || isConsultationOnly(product)
                  const isConsultationOnlyFlow = requiresConversation || (!requiresConfiguration && !isPurchasable)

                  return (
                    <ProductRelevanceItem
                      key={product.id}
                      offerEntries={product.offerEntries}
                      sortOrder={product.sortOrder}
                    >
                    <article
                      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-colors hover:border-[#ED164F]/50"
                    >
                      <Link href={buildProductUrl(product.slug, explorationContext)} className="block">
                        <div className="relative aspect-[1.08/1] overflow-hidden bg-gray-100">
                          {categoryLabel && categoryLabel.trim().toLocaleLowerCase() !== product.name.trim().toLocaleLowerCase() && (
                            <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm">
                                {categoryLabel}
                              </span>
                            </div>
                          )}

                          {product.images[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              width={520}
                              height={520}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <ProductImagePlaceholder label={`Imagen de ${product.name}`} />
                          )}
                        </div>
                      </Link>

                      <div className="space-y-4 p-5">
                        <div>
                          <Link href={buildProductUrl(product.slug, explorationContext)}>
                            <h2 className="line-clamp-2 text-xl font-black tracking-tight text-gray-950 transition-colors hover:text-[#ED164F]">
                              {product.name}
                            </h2>
                          </Link>
                          {(product.description?.trim() || product.purpose?.trim() || product.whatIs?.trim()) && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                              {product.purpose?.trim() || product.description?.trim() || product.whatIs?.trim()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            {requiresConfiguration && displayPrice !== null && (
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Desde
                              </p>
                            )}
                            {displayPrice !== null && (
                              <p className="mt-1 text-2xl font-black text-gray-950">
                                {displayPrice.toLocaleString('es-AR')}
                              </p>
                            )}
                          </div>

                          <div className="flex sm:justify-end">
                            <AddToCartButton
                              product={{
                                productId: product.id,
                                name: product.name,
                                price: displayPrice ?? 0,
                                catalogType: product.catalogType,
                                modality: product.modality,
                                creditDownPaymentPercent: product.creditDownPaymentPercent,
                                image: product.images[0] || '',
                                quantity: 1,
                              }}
                              hasVariants={requiresConfiguration}
                              slug={product.slug}
                              productHref={buildProductUrl(product.slug, explorationContext)}
                              disabled={isConsultationOnlyFlow}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                    </ProductRelevanceItem>
                  )
                })}
              </div>
            )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
