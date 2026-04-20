import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  BadgePercent,
  MessageCircleMore,
  Shield,
  Star,
  Store,
  Truck,
  Zap,
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import { getProducts } from '@/lib/products'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { buildWhatsappUrl } from '@/lib/whatsapp'

export const metadata = {
  title: 'ZAP Tienda - Impresion y grafica',
}

const features = [
  { icon: Zap, title: 'Entrega rapida', desc: 'Produccion express disponible' },
  { icon: Shield, title: 'Calidad garantizada', desc: 'Colores vibrantes y materiales premium' },
  { icon: Truck, title: 'Envios a todo el pais', desc: 'Retiro en local o envio por correo' },
  { icon: Star, title: 'Atencion personalizada', desc: 'Te asesoramos en cada trabajo' },
]

const zapCreditHighlights = [
  {
    icon: BadgePercent,
    title: 'Anticipo desde 30%',
    desc: 'Avanzas hoy y ordenas el resto en un plan claro.',
  },
  {
    icon: Store,
    title: 'Cuida tu caja',
    desc: 'Resuelve impresos y exhibicion sin desacomodar todo el mes.',
  },
  {
    icon: MessageCircleMore,
    title: 'Info en un solo lugar',
    desc: 'Lo importante en la compra. El detalle completo, aparte y a mano.',
  },
]

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    getCategories(),
    getProducts(undefined, undefined, { take: 4 }),
  ])
  const zapCreditWhatsappUrl = buildWhatsappUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    'Hola! Quiero conocer como funciona Credito ZAP para mi negocio.'
  )

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-transparent to-transparent opacity-10" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-24 md:py-32">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-500/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-orange-300">
              <Zap size={12} /> Impresion digital profesional
            </div>
            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              Tu marca,
              <br />
              <span className="text-orange-400">lista para hacerse notar.</span>
            </h1>
            <p className="mb-10 text-lg leading-relaxed text-gray-300 md:text-xl">
              Carteleria, stickers, banners, tarjetas y piezas graficas para negocios que quieren
              verse mejor, vender mejor y resolver rapido.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/productos" className="btn-primary !px-7 !py-3.5 !text-base">
                Ver productos <ArrowRight size={18} />
              </Link>
              <Link
                href="/carrito"
                className="btn-secondary !bg-white/10 !px-7 !py-3.5 !text-base !text-white !border-white/20 hover:!bg-white/20"
              >
                Mi carrito
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-orange-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Credito ZAP
            </p>
            <h2 className="mt-2 text-3xl font-black text-gray-900 md:text-4xl">
              Cuando el trabajo no puede esperar, el pago tampoco te tiene que frenar
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
              Credito ZAP te da aire para avanzar: confirmas con anticipo y acomodas el resto en
              pagos fijos. Sin vueltas raras y con el detalle completo siempre a mano.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/credito-zap" className="btn-primary">
                Conocer Credito ZAP <ArrowRight size={18} />
              </Link>
              <Link href="/productos" className="btn-secondary">
                Ver productos
              </Link>
              {zapCreditWhatsappUrl && (
                <Link
                  href={zapCreditWhatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <MessageCircleMore size={18} />
                  Hablarlo por WhatsApp
                </Link>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {zapCreditHighlights.map((highlight) => (
              <div
                key={highlight.title}
                className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-orange-500 shadow-sm">
                  <highlight.icon size={20} />
                </div>
                <p className="mt-4 text-base font-bold text-gray-900">{highlight.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{highlight.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                  <feature.icon size={20} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Explora por categoria</h2>
        <p className="mb-8 text-gray-500">Encuentra todo lo que necesitas para tu negocio</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/productos?cat=${category.slug}`}
              className="card group p-4 text-center transition-all hover:border-orange-200 hover:shadow-md hover:shadow-orange-100"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 transition-colors group-hover:bg-orange-100">
                <span className="text-2xl">Z</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{category.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-gray-900">Mas vendidos</h2>
              <p className="text-gray-500">Los favoritos de nuestros clientes</p>
            </div>
            <Link href="/productos" className="btn-secondary !py-2">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => {
              const hasVariants = product.variants && product.variants.length > 0
              const displayPrice = getProductDisplayPrice(product)

              return (
                <Link
                  key={product.id}
                  href={`/productos/${product.slug}`}
                  className="card group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-gray-100">
                    <div className="absolute left-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 shadow-sm">
                      Credito ZAP
                    </div>

                    {product.images[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={400}
                        height={400}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl">Z</div>
                    )}
                  </div>

                  <div className="p-4">
                    <p className="mb-1 text-xs font-semibold text-orange-500">
                      {product.category.name}
                    </p>
                    <h3 className="mb-2 text-sm font-semibold text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex flex-col">
                      {hasVariants && displayPrice !== null && (
                        <span className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Desde
                        </span>
                      )}
                      <p className="text-lg font-bold text-gray-900">
                        {displayPrice !== null
                          ? `$${displayPrice.toLocaleString('es-AR')}`
                          : 'Consultar'}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
