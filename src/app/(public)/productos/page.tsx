import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react'
import { getProducts } from '@/lib/products'
import { getCategories } from '@/lib/categories'
import AddToCartButton from '@/components/public/AddToCartButton'
import { getProductDisplayPrice } from '@/lib/product-pricing'

export const dynamic = 'force-dynamic'

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string }>
}) {
  const { cat, q } = await searchParams
  const [products, categories] = await Promise.all([getProducts(cat, q), getCategories()])
  const selectedCategory = categories.find((category) => category.slug === cat)

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_20%,#f8fafc_100%)]">
      <div className="mx-auto max-w-[1380px] px-4 pb-16 pt-8 sm:pt-10 xl:px-8">
        <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Catalogo ZAP
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                Piezas graficas listas para resolver mejor en desktop.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600">
                Ordenamos categorias, busqueda, precios y llamados a la accion para que la
                experiencia se sienta mas profesional y menos improvisada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Resultados
                </p>
                <p className="mt-2 text-2xl font-black text-gray-950">{products.length}</p>
                <p className="mt-1 text-sm text-gray-600">productos activos en pantalla</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Categoria
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">
                  {selectedCategory?.name || 'Todas'}
                </p>
                <p className="mt-1 text-sm text-gray-600">filtrado visible y facil de entender</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Busqueda
                </p>
                <p className="mt-2 text-base font-bold text-gray-950">
                  {q?.trim() ? `"${q.trim()}"` : 'Sin termino'}
                </p>
                <p className="mt-1 text-sm text-gray-600">con lectura clara del contexto actual</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                  <SlidersHorizontal size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Explora por categoria</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                    Filtro principal
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-row gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
                <Link
                  href="/productos"
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    !cat
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'border border-gray-200 bg-gray-50 text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
                  }`}
                >
                  Todos los productos
                </Link>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/productos?cat=${category.slug}`}
                    className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      cat === category.slug
                        ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700'
                    }`}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.55)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Compra mas clara
              </p>
              <p className="mt-3 text-lg font-black leading-tight text-gray-950">
                Precio visible, variantes claras y salida rapida al pedido.
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-600">
                Lo importante queda primero: pieza, categoria, rango real de precio y accion para
                configurar o sumar al carrito.
              </p>
            </div>
          </aside>

          <div className="space-y-5">
            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <form className="flex flex-1 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <Search size={18} className="text-gray-400" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={q}
                    placeholder="Buscar productos, trabajos o materiales"
                    className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  {cat ? <input type="hidden" name="cat" value={cat} /> : null}
                </form>

                <div className="flex flex-wrap gap-2">
                  {selectedCategory && (
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800">
                      Categoria: {selectedCategory.name}
                    </span>
                  )}
                  {q?.trim() && (
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">
                      Busqueda: {q.trim()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-gray-300 bg-white/80 px-6 py-20 text-center shadow-[0_18px_50px_-42px_rgba(15,23,42,0.2)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Sin resultados
                </p>
                <h2 className="mt-3 text-3xl font-black text-gray-950">
                  No encontramos productos con este filtro.
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-gray-600">
                  Prueba otra categoria, quita la busqueda actual o vuelve al catalogo completo
                  para retomar desde una vista mas amplia.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href="/productos" className="btn-primary">
                    Ver todo el catalogo <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0
                  const displayPrice = getProductDisplayPrice(product)

                  return (
                    <article
                      key={product.id}
                      className="group overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)] transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_70px_-44px_rgba(249,115,22,0.28)]"
                    >
                      <Link href={`/productos/${product.slug}`} className="block">
                        <div className="relative aspect-[1.08/1] overflow-hidden bg-gray-100">
                          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-700 shadow-sm">
                              {product.category.name}
                            </span>
                            <span className="rounded-full bg-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-sm shadow-orange-200">
                              Credito ZAP
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
                            <h2 className="line-clamp-2 text-xl font-black tracking-tight text-gray-950 transition-colors hover:text-orange-600">
                              {product.name}
                            </h2>
                          </Link>
                          <p className="mt-2 line-clamp-3 text-sm leading-7 text-gray-600">
                            {product.description?.trim()
                              ? product.description
                              : 'Configuracion y compra pensadas para resolver este trabajo con claridad.'}
                          </p>
                        </div>

                        <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
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
                              {product.creditDownPaymentPercent}% de anticipo sugerido con Credito ZAP
                            </p>
                          </div>

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
                          />
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
