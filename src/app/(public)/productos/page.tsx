import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircleMore, Search, SlidersHorizontal } from 'lucide-react'
import { getProducts, getCombos } from '@/lib/products'
import { getCategories } from '@/lib/categories'
import { getIntentions } from '@/lib/intentions'
import AddToCartButton from '@/components/public/AddToCartButton'
import CatalogSidebar from '@/components/public/CatalogSidebar'
import IntentionHero from '@/components/public/IntentionHero'
import ShareModal from '@/components/public/ShareModal'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { buildProductInquiryMessage, buildWhatsappUrl } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; mode?: 'product' | 'objective' | 'combo'; intent?: string }>
}) {
  const { cat, q, mode, intent } = await searchParams
  
  const intentions = await getIntentions()
  const selectedIntention = intent ? intentions.find(i => i.slug === intent) : undefined

  const [products, categories] = await Promise.all([
    mode === 'combo'
      ? getCombos(null)
      : getProducts(
          mode === 'objective' ? undefined : cat, 
          q, 
          { intentSlug: mode === 'objective' ? intent : undefined }
        ), 
    getCategories()
  ])
  const selectedCategory = categories.find((category) => category.slug === cat)

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_20%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
                {mode === 'combo' ? 'Packs Comerciales' : 'Catálogo'}
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                {mode === 'combo' 
                  ? 'Packs y Combos ZAP' 
                  : mode === 'objective' 
                    ? 'Soluciones por Objetivo' 
                    : 'Productos y servicios ZAP'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {mode === 'combo'
                  ? 'Kits completos y combos todo-en-uno diseñados específicamente para resolver la gráfica, papelería y presencia digital de tu local o lanzamiento en un solo click.'
                  : mode === 'objective'
                    ? 'Encontrá las herramientas ideales agrupadas según el momento y meta de tu negocio.'
                    : 'Gráfica, cartelería, exhibidores, merchandising, web y presencia digital.'}
              </p>
            </div>

            <div className={`grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-${q?.trim() ? '3' : '2'}`}>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Resultados
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">{products.length}</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Filtro Activo
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">
                  {mode === 'objective' && selectedIntention 
                    ? selectedIntention.name 
                    : mode === 'combo'
                      ? 'Todos los Combos'
                      : selectedCategory?.name || 'Todos'}
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

        <div className="mt-8 grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
          <CatalogSidebar 
            categories={categories}
            intentions={intentions}
            cat={cat} 
            mode={mode} 
            intent={intent} 
          />

          <div className="space-y-5 min-w-0">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <form className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 min-w-0">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar productos, trabajos o materiales"
                    className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  {cat ? <input type="hidden" name="cat" value={cat} /> : null}
                  {mode ? <input type="hidden" name="mode" value={mode} /> : null}
                  {intent ? <input type="hidden" name="intent" value={intent} /> : null}
                </form>

                <div className="flex flex-wrap items-center gap-2">
                  <ShareModal />
                  {mode === 'combo' && (
                    <span className="rounded-full border border-[#4576B9]/25 bg-[#EEF4FC] px-3 py-1.5 text-xs font-semibold text-[#2F5F9F]">
                      Packs y Combos
                    </span>
                  )}
                  {selectedIntention && mode === 'objective' && (
                    <span className="rounded-full border border-[#F66B9A]/25 bg-[#FEF1F6] px-3 py-1.5 text-xs font-semibold text-[#C91F5B]">
                      Objetivo: {selectedIntention.name}
                    </span>
                  )}
                  {selectedCategory && mode !== 'objective' && mode !== 'combo' && (
                    <span className="rounded-full border border-[#F66B9A]/25 bg-[#FEF1F6] px-3 py-1.5 text-xs font-semibold text-[#C91F5B]">
                      Categoría: {selectedCategory.name}
                    </span>
                  )}
                  {q?.trim() && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
                      Búsqueda: {q.trim()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedIntention && mode === 'objective' && (
              <IntentionHero intention={selectedIntention} />
            )}

            {products.length === 0 ? (
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
                  const hasVariants = product.variants && product.variants.length > 0
                  const displayPrice = getProductDisplayPrice(product)
                  const productIntent = displayPrice === null ? 'cotizar' : 'consultar'
                  const inquiryUrl = buildWhatsappUrl(
                    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
                    buildProductInquiryMessage({
                      name: product.name,
                      categoryName: product.category.name,
                      price: displayPrice,
                      creditDownPaymentPercent: product.creditDownPaymentPercent,
                      slug: product.slug,
                      intent: productIntent,
                    })
                  )

                  return (
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:border-[#F66B9A]/25 hover:shadow-[0_28px_70px_-44px_rgba(237,44,113,0.28)]"
                    >
                      <Link href={`/productos/${product.slug}`} className="block">
                        <div className="relative aspect-[1.08/1] overflow-hidden bg-gray-100">
                          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm">
                              {product.category.name}
                            </span>
                            <span className="rounded-full bg-[#ED2C71] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm shadow-[#ED2C71]/20">
                              Crédito ZAP
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
                            <div className="flex h-full w-full items-center justify-center text-3xl font-semibold text-gray-300">
                              IMG
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="space-y-4 p-5">
                        <div>
                          <Link href={`/productos/${product.slug}`}>
                            <h2 className="line-clamp-2 text-xl font-black tracking-tight text-gray-950 transition-colors hover:text-[#ED2C71]">
                              {product.name}
                            </h2>
                          </Link>
                          {product.description?.trim() && (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                              {product.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            {hasVariants && displayPrice !== null && (
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Desde
                              </p>
                            )}
                            <p className="mt-1 text-2xl font-black text-gray-950">
                              {displayPrice !== null
                                ? `$${displayPrice.toLocaleString('es-AR')}`
                                : 'Consultar'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Crédito ZAP desde {product.creditDownPaymentPercent}% de anticipo
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <AddToCartButton
                              product={{
                                productId: product.id,
                                name: product.name,
                                price: displayPrice ?? 0,
                                creditDownPaymentPercent: product.creditDownPaymentPercent,
                                image: product.images[0] || '',
                                quantity: 1,
                                isService: product.category.isService,
                              }}
                              hasVariants={hasVariants}
                              slug={product.slug}
                              disabled={!hasVariants && displayPrice === null}
                              consultUrl={inquiryUrl}
                              consultLabel="Cotizar"
                            />
                            {inquiryUrl && displayPrice !== null && (
                              <Link
                                href={inquiryUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-[#F66B9A]/25 hover:bg-[#FEF1F6] hover:text-[#C91F5B]"
                              >
                                <MessageCircleMore size={16} />
                                Consultar
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
