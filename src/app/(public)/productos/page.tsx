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
import DiscoveryAdjacentSection from '@/components/public/DiscoveryAdjacentSection'
import DiscoveryOfferSection from '@/components/public/DiscoveryOfferSection'
import ShareModal from '@/components/public/ShareModal'
import ProductImagePlaceholder from '@/components/public/ProductImagePlaceholder'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { getProductFamilyLabel, isDevelopment, isConsultationOnly } from '@/lib/catalog-domain'
import { buildProductUrl, type ExplorationContext } from '@/lib/exploration-context'

const BUSINESS_CONTEXT: Record<string, string> = {
  gastronomia: 'Sabemos que un negocio gastronómico puede necesitar vender más, hacerse encontrar, mostrar mejor lo que ofrece y hacer que sus clientes vuelvan.',
  'moda-showrooms': 'Sabemos que una marca de moda necesita que producto, espacio, comunicación y experiencia se sientan parte de lo mismo.',
  inmobiliarias: 'Sabemos que una inmobiliaria puede necesitar captar propiedades, generar consultas, transmitir confianza y hacer que sus propiedades se vean mejor.',
  'belleza-salud': 'Sabemos que un negocio de belleza o salud necesita que marca, espacio, agenda y comunicación acompañen la experiencia que quiere construir.',
  'comercios-retail': 'Sabemos que un comercio puede necesitar atraer gente, vender mejor en el local, ordenar su presencia y hacer que su marca se reconozca.',
  'eventos-experiencias': 'Sabemos que un evento necesita atraer personas, generar contactos y convertir cada punto de contacto en parte de la experiencia.',
  wellness: 'Sabemos que un espacio de wellness puede necesitar conseguir alumnos, llenar la agenda, hacerse reconocer y ordenar cómo se presenta.',
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
  const businessSituations = getBusinessSituations(rubro, situations)
  const [products, contextualProducts, categories] = await Promise.all([
    getProducts(
      isSituationMode || mode === 'rubro' ? undefined : cat,
      q,
      {
        // The URL may retain a previous choice as exploration context.
        // It becomes a filter only when its corresponding mode is active.
        situationSlug: isSituationMode ? selectedSituation?.slug : undefined,
        needSlug: isSituationMode && selectedSituation ? necesidad : undefined,
        businessTypeSlug: mode === 'rubro' ? rubro : undefined,
        catalogType: mode === 'product' ? (tipo === 'cosa' ? 'COSA' : tipo === 'desarrollo' ? 'DESARROLLO' : undefined) : undefined,
      }
    ), 
    getProducts(undefined, undefined, rubro ? { businessTypeSlug: rubro, take: 10 } : undefined),
    getPublicCategories()
  ])
  const selectedCategory = categories.find((category) => category.slug === cat)
  const selectedCatalogTypeLabel = tipo === 'desarrollo' ? 'Desarrollos' : tipo === 'cosa' ? 'Cosas' : null

  // Guided discovery now follows a single path:
  // Situación → Necesidad → OfertaMatrix → next step.
  // The old multi-step situation prototype is no longer part of the primary flow.
  const selectedNeed = selectedSituation?.needs.find((need) => need.slug === necesidad)
  const explorationContext: ExplorationContext = {
    mode: isSituationMode ? 'situation' : mode === 'rubro' ? 'rubro' : mode === 'product' ? 'product' : undefined,
    businessTypeSlug: rubro,
    situationSlug: selectedSituation?.slug || situationSlug,
    needSlug: selectedNeed?.slug || necesidad,
  }

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_20%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        {!isSituationMode && (
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
                {mode === 'rubro' ? 'Rubro' : tipo === 'desarrollo' ? 'Desarrollos' : 'Cosas'}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {isSituationMode
                    ? 'Opciones para esta situación'
                    : mode === 'rubro'
                      ? selectedBusinessType?.name || 'Elegí tu rubro'
                      : tipo === 'desarrollo' ? 'Desarrollos ZAP' : tipo === 'cosa' ? 'Cosas ZAP' : 'Cosas y desarrollos ZAP'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {isSituationMode
                    ? 'Partimos de lo que está pasando o de lo que querés lograr. Elegí sólo lo que tenga sentido para avanzar.'
                    : mode === 'rubro'
                      ? selectedBusinessType
                        ? BUSINESS_CONTEXT[selectedBusinessType.slug] || 'Conocemos el contexto de este rubro. Primero mirá qué está pasando en tu negocio y después decidimos dónde tiene sentido intervenir.'
                        : 'Elegí tu rubro para empezar desde el contexto de tu negocio.'
                      : tipo === 'desarrollo'
                        ? 'Lo que construimos para resolver algo que necesita contexto, trabajo a medida o una intervención que no se compra como una cosa.'
                        : tipo === 'cosa'
                          ? 'Lo que producimos y podés elegir, configurar o comprar directamente para tu negocio.'
                          : 'Para cuando ya sabés qué necesitás: cosas que podés elegir, configurar o comprar, o desarrollos que podés conocer.'}
              </p>
            </div>

            <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-1 ${q?.trim() ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Resultados
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">{products.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Explorando
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">
                  {isSituationMode && selectedSituation
                    ? selectedSituation.name
                    : mode === 'rubro'
                        ? selectedBusinessType?.name || 'Todos los rubros'
                        : selectedCatalogTypeLabel || selectedCategory?.name || 'Todos'}
                </p>
              </div>
              {q?.trim() && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    Búsqueda
                  </p>
                  <p className="mt-2 text-base font-bold text-gray-950">
                    &quot;{q.trim()}&quot;
                  </p>
                </div>
              )}
            </div>
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
                <IntentionHero intention={selectedSituation} />
                <NeedsSection situation={selectedSituation} businessTypeSlug={rubro} selectedNeedSlug={necesidad} />
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
                    {rubro && (
                      <DiscoveryAdjacentSection
                        products={contextualProducts}
                        selectedProductIds={products.map((product) => product.id)}
                        context={explorationContext}
                      />
                    )}
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
                  const displayPrice = getProductDisplayPrice(product)
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
                          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm">
                              {getProductFamilyLabel(product)}
                            </span>
                          </div>

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
                            <p className="mt-1 text-2xl font-black text-gray-950">
                              {displayPrice !== null
                                ? `$${displayPrice.toLocaleString('es-AR')}`
                                : 'Consultar'}
                            </p>
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
