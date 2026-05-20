import Link from 'next/link'
import {
  ArrowRight,
  MessageCircleMore,
  Package,
  ShieldCheck,
  Store,
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import { getProducts, getCombos } from '@/lib/products'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { buildProductInquiryMessage, buildWhatsappUrl } from '@/lib/whatsapp'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import AddToCartButton from '@/components/public/AddToCartButton'
import ComboSection from '@/components/public/ComboSection'

export const metadata = {
  title: 'ZAP Tienda - Agencia Creativa',
}

const valueProps = [
  {
    icon: Package,
    title: 'Listo para producir',
    desc: 'Elegí el formato, dejá detalles importantes y prepará el trabajo con una lectura clara desde el inicio.',
  },
  {
    icon: ShieldCheck,
    title: 'Precio definido',
    desc: 'Medidas, terminaciones y valores visibles para decidir con seguridad antes de avanzar.',
  },
  {
    icon: Store,
    title: 'Criterio de agencia',
    desc: 'Soluciones pensadas para sostener tu marca en la calle, el local, Google y cada punto de contacto.',
  },
]

const buyingMoments = [
  {
    title: 'Vidriera y fachada',
    desc: 'Carteles, banners y piezas visuales para que tu negocio se haga notar desde la calle.',
  },
  {
    title: 'Mostrador y punto de venta',
    desc: 'Etiquetas, stickers, tarjetas y piezas que ayudan a vender mejor en el momento exacto.',
  },
  {
    title: 'Promos y lanzamientos',
    desc: 'Material gráfico ágil para campañas, fechas especiales y movimientos rápidos de marca.',
  },
]

export default async function HomePage() {
  const session = await auth()
  let priorityCategorySlugs: string[] = []
  let businessTypeName: string | null = null
  let businessTypeId: string | null = null

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        businessType: {
          include: { categories: { select: { slug: true } } },
        },
      },
    })
    if (user?.businessType) {
      businessTypeId = user.businessType.id
      businessTypeName = user.businessType.name
      if (user.businessType.categories) {
        priorityCategorySlugs = user.businessType.categories.map((c) => c.slug)
      }
    }
  }

  const [categories, allProducts, combos] = await Promise.all([
    getCategories(),
    getProducts(undefined, undefined, { take: 16 }),
    getCombos(businessTypeId),
  ])

  // Prioritize products from the user's rubro categories
  let featuredProducts = allProducts
  if (priorityCategorySlugs.length > 0) {
    const prioritized = allProducts.filter((p) =>
      priorityCategorySlugs.includes(p.category.slug)
    )
    const rest = allProducts.filter(
      (p) => !priorityCategorySlugs.includes(p.category.slug)
    )
    featuredProducts = [...prioritized, ...rest].slice(0, 8)
  } else {
    featuredProducts = allProducts.slice(0, 8)
  }

  const heroProducts = featuredProducts.slice(0, 3)
  const primaryHeroProduct = heroProducts[0]
  const secondaryHeroProducts = heroProducts.slice(1)
  const catalogProducts = featuredProducts.slice(0, 6)
  const primaryHeroDisplayPrice = primaryHeroProduct
    ? getProductDisplayPrice(primaryHeroProduct)
    : null

  const salesWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Estoy viendo la tienda y quiero elegir lo mejor para mi negocio.'
  )
  const buildProductInquiryUrl = (
    product: (typeof featuredProducts)[number],
    price: number | null
  ) =>
    buildWhatsappUrl(
      process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
      buildProductInquiryMessage({
        name: product.name,
        categoryName: product.category.name,
        price,
        slug: product.slug,
        intent: price === null ? 'cotizar' : 'consultar',
      })
    )

  return (
    <div className="bg-[linear-gradient(180deg,#fffbfd_0%,#FEF1F6_12%,#f8fafc_100%)]">
      <section className="relative overflow-hidden border-b border-[#F66B9A]/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(237,44,113,0.1),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(69,118,185,0.08),transparent_32%)]" />

        <div className="relative mx-auto max-w-[1380px] px-4 pb-14 pt-8 sm:pt-10 xl:px-8 xl:pb-18">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#FEF1F6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C91F5B]">
                  Marca, gráfica y digital
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm">
                  Tienda ZAP
                </span>
              </div>

              <div>
                <h1 className="max-w-4xl text-5xl font-black tracking-tight text-gray-950 sm:text-6xl xl:text-7xl">
                  Tu marca lista para verse mejor, aparecer más y moverse en serio.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
                  Diseño, producción gráfica, merchandising, exhibición, web y presencia digital
                  para negocios que necesitan dejar de improvisar como se muestran.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/productos" className="btn-primary !px-7 !py-3.5 !text-base">
                  Ver soluciones <ArrowRight size={18} />
                </Link>
                {salesWhatsappUrl && (
                  <Link
                    href={salesWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary !px-7 !py-3.5 !text-base"
                  >
                    <MessageCircleMore size={18} />
                    Hablar con ZAP
                  </Link>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {valueProps.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[28px] border border-gray-200 bg-white/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.18)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF1F6] text-[#ED2C71]">
                      <item.icon size={20} />
                    </div>
                    <p className="mt-4 text-base font-black text-gray-950">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {primaryHeroProduct ? (
                <article className="overflow-hidden rounded-[36px] border border-gray-200 bg-white shadow-[0_28px_80px_-46px_rgba(15,23,42,0.32)]">
                  <Link href={`/productos/${primaryHeroProduct.slug}`} className="block">
                    <div className="relative aspect-[1.2/1] overflow-hidden bg-gray-100">
                      {primaryHeroProduct.images[0] ? (
                        <img
                          src={primaryHeroProduct.images[0]}
                          alt={primaryHeroProduct.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-black text-gray-300">
                          Z
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.78))] p-6">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C91F5B]">
                          {primaryHeroProduct.category.name}
                        </span>
                        <h2 className="mt-3 text-2xl font-black text-white sm:text-3xl">
                          {primaryHeroProduct.name}
                        </h2>
                      </div>
                    </div>
                  </Link>

                  <div className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <div>
                      <p className="text-sm leading-7 text-gray-600">
                        {primaryHeroProduct.description?.trim()
                          ? primaryHeroProduct.description
                          : 'Una pieza creada para sumar presencia visual con terminacion profesional.'}
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        {primaryHeroProduct.variants.length > 0 &&
                        primaryHeroDisplayPrice !== null
                          ? 'Desde'
                          : 'Precio'}
                      </p>
                      <p className="mt-1 text-3xl font-black text-gray-950">
                        {primaryHeroDisplayPrice !== null
                          ? `$${primaryHeroDisplayPrice.toLocaleString('es-AR')}`
                          : 'Consultar'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <AddToCartButton
                        product={{
                          productId: primaryHeroProduct.id,
                          name: primaryHeroProduct.name,
                          price: primaryHeroDisplayPrice ?? 0,
                          creditDownPaymentPercent: primaryHeroProduct.creditDownPaymentPercent,
                          image: primaryHeroProduct.images[0] || '',
                          quantity: 1,
                          isService: primaryHeroProduct.category.isService,
                        }}
                        hasVariants={primaryHeroProduct.variants.length > 0}
                        slug={primaryHeroProduct.slug}
                        disabled={
                          primaryHeroProduct.variants.length === 0 &&
                          primaryHeroDisplayPrice === null
                        }
                        consultUrl={buildProductInquiryUrl(primaryHeroProduct, primaryHeroDisplayPrice)}
                        consultLabel="Cotizar"
                      />
                      {primaryHeroDisplayPrice !== null &&
                        buildProductInquiryUrl(primaryHeroProduct, primaryHeroDisplayPrice) && (
                          <Link
                            href={buildProductInquiryUrl(primaryHeroProduct, primaryHeroDisplayPrice)!}
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
                </article>
              ) : null}

              {secondaryHeroProducts.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {secondaryHeroProducts.map((product) => {
                    const displayPrice = getProductDisplayPrice(product)
                    const hasVariants = product.variants.length > 0

                    return (
                      <Link
                        key={product.id}
                        href={`/productos/${product.slug}`}
                        className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-1 hover:border-[#F66B9A]/30"
                      >
                        <div className="relative aspect-[1.2/1] overflow-hidden bg-gray-100">
                          {product.images[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl font-black text-gray-300">
                              Z
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
                            {product.category.name}
                          </p>
                          <h3 className="mt-2 text-lg font-black text-gray-950">{product.name}</h3>
                          <p className="mt-3 text-sm font-semibold text-gray-900">
                            {displayPrice !== null
                              ? `${hasVariants ? 'Desde ' : ''}$${displayPrice.toLocaleString('es-AR')}`
                              : 'Consultar'}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <ComboSection combos={combos} businessTypeName={businessTypeName} />

      {catalogProducts.length > 0 && (
        <section className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
                Soluciones destacadas
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                Empezá por lo que hoy puede mover tu marca.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                Una selección curada de gráfica, exhibición, merchandising y servicios digitales para resolver con criterio.
              </p>
            </div>

            <Link href="/productos" className="btn-secondary !py-2.5">
              Ver todo el catálogo <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalogProducts.map((product) => {
              const displayPrice = getProductDisplayPrice(product)
              const hasVariants = product.variants.length > 0
              const inquiryUrl = buildProductInquiryUrl(product, displayPrice)

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.24)] transition-all hover:-translate-y-1 hover:border-[#F66B9A]/30 hover:shadow-[0_28px_70px_-44px_rgba(237,44,113,0.18)]"
                >
                  <Link href={`/productos/${product.slug}`} className="block">
                    <div className="relative aspect-[1.16/1] overflow-hidden bg-gray-100">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-black text-gray-300">
                          Z
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-[#FEF1F6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C91F5B]">
                        {product.category.name}
                      </span>
                    </div>

                    <div>
                      <Link href={`/productos/${product.slug}`}>
                        <h3 className="text-2xl font-black tracking-tight text-gray-950 transition-colors hover:text-[#ED2C71]">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
                        {product.description?.trim()
                          ? product.description
                          : 'Solucion ZAP lista para definir, producir y mover tu marca con criterio.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {hasVariants && displayPrice !== null ? 'Desde' : 'Precio'}
                        </p>
                        <p className="mt-1 text-2xl font-black text-gray-950">
                          {displayPrice !== null
                            ? `$${displayPrice.toLocaleString('es-AR')}`
                            : 'Consultar'}
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
        </section>
      )}

      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
              Elegí por objetivo
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Tres caminos para entender que necesita tu marca.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {buyingMoments.map((moment) => (
              <div
                key={moment.title}
                className="rounded-[30px] border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#fef8fb_100%)] p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.16)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
                  Contexto de uso
                </p>
                <h3 className="mt-3 text-2xl font-black text-gray-950">{moment.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{moment.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-4 py-12 xl:px-8">
        <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.14)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                También por rubro
              </p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">
                Si preferís entrar por rubro, las categorías quedan a mano sin quitarle protagonismo a las soluciones.
              </h2>
            </div>

            <Link href="/productos" className="text-sm font-semibold text-[#ED2C71] hover:text-[#C91F5B]">
              Abrir catálogo completo
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?cat=${category.slug}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-[#F66B9A]/30 hover:bg-[#FEF1F6] hover:text-[#C91F5B]"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
