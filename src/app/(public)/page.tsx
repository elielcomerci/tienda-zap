export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { getCategories } from '@/lib/actions/categories'
import { getProducts } from '@/lib/actions/products'
import { ArrowRight, Star, Truck, Shield, Zap } from 'lucide-react'

export const metadata = {
  title: 'ZAP Tienda â€” ImpresiÃ³n y GrÃ¡fica',
}

const features = [
  { icon: Zap, title: 'Entrega rÃ¡pida', desc: 'ProducciÃ³n express disponible' },
  { icon: Shield, title: 'Calidad garantizada', desc: 'Colores vibrantes y materiales premium' },
  { icon: Truck, title: 'EnvÃ­os a todo el paÃ­s', desc: 'Retiro en local o envÃ­o por correo' },
  { icon: Star, title: 'AtenciÃ³n personalizada', desc: 'Te asesoramos en tu diseÃ±o' },
]

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getProducts(undefined, undefined),
  ])

  const featuredProducts = featured.slice(0, 4)

  return (
    <div>
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-orange-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-24 md:py-32 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
              <Zap size={12} /> ImpresiÃ³n digital profesional
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
              Tu imagen,
              <br />
              <span className="text-orange-400">impresa a la perfecciÃ³n.</span>
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-10 leading-relaxed">
              CartelerÃ­a, tarjetas, banners, stickers y mÃ¡s. DiseÃ±os que comunican, colores que impactan.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/productos" className="btn-primary !text-base !px-7 !py-3.5">
                Ver productos <ArrowRight size={18} />
              </Link>
              <Link href="/carrito" className="btn-secondary !text-base !px-7 !py-3.5 !bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
                Mi carrito
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <f.icon size={20} className="text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-900">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORÃAS */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ExplorÃ¡ por categorÃ­a</h2>
        <p className="text-gray-500 mb-8">EncontrÃ¡ todo lo que necesitÃ¡s para tu negocio</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/productos?cat=${cat.slug}`}
              className="card p-4 text-center hover:border-orange-200 hover:shadow-orange-100 hover:shadow-md transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-100 transition-colors">
                <span className="text-2xl">ðŸ–¨ï¸</span>
              </div>
              <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* PRODUCTOS DESTACADOS */}
      {featuredProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">MÃ¡s vendidos</h2>
              <p className="text-gray-500">Los favoritos de nuestros clientes</p>
            </div>
            <Link href="/productos" className="btn-secondary !py-2">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/productos/${product.slug}`} className="card overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  {product.images[0] ? (
                    <Image src={product.images[0]} alt={product.name} width={400} height={400}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">ðŸ–¨ï¸</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-orange-500 font-semibold mb-1">{product.category.name}</p>
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-lg font-bold text-gray-900">
                    ${product.price.toLocaleString('es-AR')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
