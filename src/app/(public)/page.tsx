import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  MessageCircleMore,
  Package,
  ShieldCheck,
  Store,
  Zap,
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import { getProducts } from '@/lib/products'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import AddToCartButton from '@/components/public/AddToCartButton'

export const metadata = {
  title: 'ZAP Tienda - Impresion y grafica',
}

const valueProps = [
  {
    icon: Package,
    title: 'Piezas listas para pedir',
    desc: 'Configuras variantes, cantidad y notas sin irte a un formulario eterno.',
  },
  {
    icon: ShieldCheck,
    title: 'Precio claro',
    desc: 'Ves el valor real del trabajo o el minimo desde la primera mirada.',
  },
  {
    icon: Store,
    title: 'Hecho para negocios',
    desc: 'Carteleria, mostrador, promociones y exhibicion con foco comercial.',
  },
]

const buyingMoments = [
  {
    title: 'Vidriera y fachada',
    desc: 'Banners, carteles y piezas para que el local se vea firme desde afuera.',
  },
  {
    title: 'Mostrador y punto de venta',
    desc: 'Tarjetas, stickers, precios y piezas cortas para vender mejor en el momento.',
  },
  {
    title: 'Campanas y promos',
    desc: 'Material rapido para lanzamientos, fechas clave o activaciones de marca.',
  },
]

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getProducts(undefined, undefined, { take: 8 }),
  ])

  const heroProducts = featuredProducts.slice(0, 3)
  const primaryHeroProduct = heroProducts[0]
  const secondaryHeroProducts = heroProducts.slice(1)
  const catalogProducts = featuredProducts.slice(0, 6)

  const salesWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Estoy viendo la tienda y quiero elegir la mejor pieza grafica para mi negocio.'
  )
  const creditWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Quiero evaluar un pedido con Credito ZAP.'
  )

  return (
    <div className="bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ed_12%,#f8fafc_100%)]">
      <section className="relative overflow-hidden border-b border-orange-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_32%)]" />

        <div className="relative mx-auto max-w-[1380px] px-4 pb-14 pt-8 sm:pt-10 xl:px-8 xl:pb-18">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:items-start">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                  Grafica para vender mejor
                </span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600 shadow-sm">
                  Catalogo ZAP
                </span>
              </div>

              <div>
                <h1 className="max-w-4xl text-5xl font-black tracking-tight text-gray-950 sm:text-6xl xl:text-7xl">
                  Piezas graficas pensadas para mover negocio, no para llenar una landing.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
                  Carteleria, tarjetas, stickers, banners y material comercial con una entrada
                  rapida al producto. Menos vueltas, mas piezas listas para pedir.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/productos" className="btn-primary !px-7 !py-3.5 !text-base">
                  Ver catalogo <ArrowRight size={18} />
                </Link>
                {salesWhatsappUrl && (
                  <Link
                    href={salesWhatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary !px-7 !py-3.5 !text-base"
                  >
                    <MessageCircleMore size={18} />
                    Elegir por WhatsApp
                  </Link>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {valueProps.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[28px] border border-gray-200 bg-white/90 p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.18)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
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
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-700">
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
                          : 'Una de las piezas que mas rapido resuelven presencia comercial.'}
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        {primaryHeroProduct.variants.length > 0 &&
                        getProductDisplayPrice(primaryHeroProduct) !== null
                          ? 'Desde'
                          : 'Precio'}
                      </p>
                      <p className="mt-1 text-3xl font-black text-gray-950">
                        {getProductDisplayPrice(primaryHeroProduct) !== null
                          ? `$${getProductDisplayPrice(primaryHeroProduct)!.toLocaleString('es-AR')}`
                          : 'Consultar'}
                      </p>
                    </div>

                    <AddToCartButton
                      product={{
                        productId: primaryHeroProduct.id,
                        name: primaryHeroProduct.name,
                        price: getProductDisplayPrice(primaryHeroProduct) ?? 0,
                        creditDownPaymentPercent: primaryHeroProduct.creditDownPaymentPercent,
                        image: primaryHeroProduct.images[0] || '',
                        quantity: 1,
                        isService: primaryHeroProduct.category.isService,
                      }}
                      hasVariants={primaryHeroProduct.variants.length > 0}
                      slug={primaryHeroProduct.slug}
                      disabled={
                        primaryHeroProduct.variants.length === 0 &&
                        getProductDisplayPrice(primaryHeroProduct) === null
                      }
                    />
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
                        className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.2)] transition-all hover:-translate-y-1 hover:border-orange-200"
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
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
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

      <section className="border-b border-orange-100 bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-6 xl:px-8">
          <div className="flex flex-col gap-4 rounded-[30px] border border-orange-200 bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5 shadow-[0_18px_50px_-42px_rgba(249,115,22,0.28)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Credito ZAP
              </p>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                Si necesitas mover un trabajo hoy, puedes activarlo con anticipo desde 30%.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/credito-zap" className="btn-secondary !py-2.5">
                Ver credito
              </Link>
              {creditWhatsappUrl && (
                <Link
                  href={creditWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary !py-2.5"
                >
                  <BadgePercent size={18} />
                  Consultarlo
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {catalogProducts.length > 0 && (
        <section className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Productos destacados
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                Entra por la pieza, no por la categoria.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-600">
                Una seleccion directa para arrancar por trabajos concretos y llegar mas rapido al
                pedido.
              </p>
            </div>

            <Link href="/productos" className="btn-secondary !py-2.5">
              Ver todo el catalogo <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {catalogProducts.map((product) => {
              const displayPrice = getProductDisplayPrice(product)
              const hasVariants = product.variants.length > 0

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.24)] transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_28px_70px_-44px_rgba(249,115,22,0.22)]"
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
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
                        {product.category.name}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Credito ZAP
                      </span>
                    </div>

                    <div>
                      <Link href={`/productos/${product.slug}`}>
                        <h3 className="text-2xl font-black tracking-tight text-gray-950 transition-colors hover:text-orange-600">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="mt-3 line-clamp-3 text-sm leading-7 text-gray-600">
                        {product.description?.trim()
                          ? product.description
                          : 'Pieza grafica lista para configurar y pedir desde la tienda.'}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {hasVariants && displayPrice !== null ? 'Desde' : 'Precio'}
                        </p>
                        <p className="mt-1 text-2xl font-black text-gray-950">
                          {displayPrice !== null
                            ? `$${displayPrice.toLocaleString('es-AR')}`
                            : 'Consultar'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Anticipo sugerido {product.creditDownPaymentPercent}% con Credito ZAP
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
        </section>
      )}

      <section className="border-y border-gray-100 bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Compra por objetivo
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Tres entradas rapidas para elegir mejor.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {buyingMoments.map((moment) => (
              <div
                key={moment.title}
                className="rounded-[30px] border border-gray-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffaf5_100%)] p-6 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.16)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Contexto de compra
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
                Tambien por rubro
              </p>
              <h2 className="mt-2 text-2xl font-black text-gray-950">
                Si prefieres entrar por categoria, la dejamos a mano sin robarse la home.
              </h2>
            </div>

            <Link href="/productos" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
              Abrir catalogo completo
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/productos?cat=${category.slug}`}
                className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
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
