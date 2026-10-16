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
import IntentionHero from '@/components/public/IntentionHero'
import NeedsSection from '@/components/public/NeedsSection'
import DiscoveryOfferSection from '@/components/public/DiscoveryOfferSection'
import ShareModal from '@/components/public/ShareModal'
import ProductImagePlaceholder from '@/components/public/ProductImagePlaceholder'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { getProductFamilyLabel, isDevelopment, isConsultationOnly } from '@/lib/catalog-domain'
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
  'moda-showrooms': ['estoy-por-abrir', 'quiero-vender-mas-en-el-local', 'quiero-vender-online', 'quiero-renovar-la-marca-o-el-espacio', 'quiero-ordenar-mi-negocio'],
  inmobiliarias: ['estoy-abriendo-o-renovando-la-inmobiliaria', 'quiero-captar-propiedades', 'quiero-conseguir-mas-consultas', 'quiero-transmitir-mas-confianza', 'quiero-ordenar-mi-negocio'],
  'belleza-salud': ['estoy-por-abrir', 'quiero-llenar-la-agenda', 'quiero-que-mis-clientes-vuelvan', 'quiero-que-mi-marca-se-vea-mejor', 'quiero-ordenar-mi-negocio'],
  'comercios-retail': ['estoy-por-abrir', 'quiero-que-me-encuentren', 'quiero-vender-mas', 'quiero-renovar-el-local', 'quiero-ordenar-mi-negocio'],
  'eventos-experiencias': ['tengo-un-evento', 'quiero-atraer-gente-al-evento-o-stand', 'quiero-generar-contactos', 'quiero-ordenar-mi-negocio'],
  wellness: ['estoy-por-abrir', 'quiero-conseguir-alumnos', 'quiero-llenar-la-agenda', 'quiero-mejorar-mi-espacio', 'quiero-ordenar-mi-negocio'],
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
  title: 'Productos y desarrollos para tu negocio',
  description:
    'Productos para elegir o configurar y desarrollos a medida de ZAP.',
  alternates: {
    canonical: '/productos',
  },
  openGraph: {
    title: 'Productos y desarrollos para tu negocio | Tienda ZAP',
    description:
      'Productos para elegir o configurar y desarrollos a medida de ZAP.',
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
    redirect('/productos?mode=rubro')
  }

  const mode = requestedMode
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
      isSituationMode || mode === 'rubro' ? undefined : cat,
      q,
      {
        // The URL may retain a previous choice as exploration context.
        // It becomes a filter only when its corresponding mode is active.
        situationSlug: isSituationMode ? selectedSituation?.slug : undefined,
        needSlug: isSituationMode && selectedSituation ? necesidad : undefined,
        // Keep recommendations inside the selected business context in guided discovery too.
        businessTypeSlug: isSituationMode || mode === 'rubro' ? rubro : undefined,
        rankContext: mode === 'product' && selectedSituation ? {
          businessTypeSlug: rubro,
          situationSlug: selectedSituation.slug,
          needSlug: selectedSituation.needs.some((need) => need.slug === necesidad) ? necesidad : undefined,
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
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_20%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        {!isSituationMode && (
          <section className="mb-8 flex flex-col gap-3 border-b border-gray-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {mode === 'rubro'
                  ? selectedBusinessType?.name || 'Elegí tu rubro'
                  : tipo === 'desarrollo'
                    ? 'Desarrollos ZAP'
                    : tipo === 'cosa'
                      ? 'Productos ZAP'
                      : 'Productos y desarrollos para tu negocio'}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {mode === 'rubro'
                  ? selectedBusinessType
                    ? BUSINESS_CONTEXT[selectedBusinessType.slug] || 'Mirá qué necesita tu negocio y dónde tiene sentido intervenir.'
                    : 'Elegí tu rubro para explorar desde el contexto de tu negocio.'
                  : tipo === 'desarrollo'
                    ? 'Soluciones a medida para resolver necesidades concretas de tu negocio.'
                    : tipo === 'cosa'
                      ? 'Productos que podés elegir, configurar o comprar.'
                      : 'Productos para elegir o configurar y desarrollos pensados para resolver necesidades concretas.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>{products.length} {products.length === 1 ? 'opción' : 'opciones'}</span>
              {q?.trim() && (
                <span className="rounded-full bg-white px-3 py-1.5 text-gray-700 ring-1 ring-gray-200">
                  Búsqueda: “{q.trim()}”
                </span>
              )}
            </div>
          </section>
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
            {isSituationMode && !selectedSituation && (
              <section className="rounded-[30px] bg-white/55 px-1 py-1 sm:px-2">
                <div className="mb-5">
                  <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950">
                    ¿Qué está pasando en tu negocio?
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                    Elegí la situación que más se parece a la tuya. A partir de ahí afinamos qué necesitás resolver.
                  </p>
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
                {rubro && (
                  <div className="mt-5 border-t border-gray-200 pt-4">
                    <Link
                      href={buildProductsUrl({ mode: 'rubro', businessTypeSlug: rubro })}
                      className="text-sm font-semibold text-gray-600 hover:text-[#ED164F]"
                    >
                      ← Volver al rubro
                    </Link>
                  </div>
                )}
              </section>
            )}

            {selectedBusinessType && mode === 'rubro' && !selectedSituation && (
              <section className="rounded-[30px] bg-white/55 px-1 py-1 sm:px-2">
                <div className="mb-5">
                  <h2 className="mt-2 text-xl font-black tracking-tight text-gray-950">¿Qué está pasando en tu negocio?</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">Elegí la situación que más se parece a la tuya. A partir de ahí afinamos qué necesitás resolver.</p>
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
                <div className="mt-5 flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/productos?mode=situation&rubro=${encodeURIComponent(rubro || '')}`} className="text-sm font-semibold text-gray-600 hover:text-[#ED164F]">
                    Ver todas las situaciones →
                  </Link>
                  <Link href={`/productos?mode=rubro&rubro=${encodeURIComponent(rubro || '')}`} className="text-sm font-semibold text-gray-700 hover:text-[#ED164F]">
                    Ver todo lo que hacemos para {selectedBusinessType.name} →
                  </Link>
                </div>
              </section>
            )}

            {selectedSituation && isSituationMode && (
              <>
                <div className="flex items-center justify-between gap-4 px-0.5 sm:px-1">
                  <Link
                    href={rubro ? `/productos?mode=rubro&rubro=${encodeURIComponent(rubro)}` : '/productos'}
                    className="text-sm font-semibold text-gray-500 hover:text-[#C2103F]"
                  >
                    ← Cambiar contexto
                  </Link>
                  <ShareModal />
                </div>
                <IntentionHero intention={selectedSituation} businessTypeName={selectedBusinessType?.name} />
                <NeedsSection situation={selectedSituation} businessTypeSlug={rubro} businessTypeName={selectedBusinessType?.name} selectedNeedSlug={necesidad} />
                {selectedNeed && (
                  <>
                    <DiscoveryOfferSection
                      products={products}
                      needName={selectedNeed.name}
                      businessTypeName={selectedBusinessType?.name}
                      situationName={selectedSituation.name}
                      businessTypeSlug={rubro}
                      situationSlug={selectedSituation.slug}
                      needSlug={selectedNeed.slug}
                    />
                  </>
                )}
              </>
            )}

            {!isSituationMode && mode !== 'rubro' && (
              products.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-gray-300 bg-white/80 px-6 py-16 text-center shadow-[0_18px_50px_-42px_rgba(15,23,42,0.2)]">
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
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:border-[#F7638B]/25 hover:shadow-[0_28px_70px_-44px_rgba(237, 22, 79,0.28)]"
                    >
                      <Link href={buildProductUrl(product.slug, explorationContext)} className="block">
                        <div className="relative aspect-[1.08/1] overflow-hidden bg-gray-100">
                          {getProductFamilyLabel(product).trim().toLocaleLowerCase() !== product.name.trim().toLocaleLowerCase() && (
                            <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm">
                                {getProductFamilyLabel(product)}
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
                              {product.description?.trim() || product.purpose?.trim() || product.whatIs?.trim()}
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
                  )
                })}
              </div>
            )
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
