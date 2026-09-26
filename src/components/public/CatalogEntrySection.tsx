import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getProductDisplayPrice } from '@/lib/product-pricing'

interface ProductSnippet {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  price: number
  category: { name: string; isService: boolean }
  variants: { price: number }[]
  quoterConfig: unknown | null
}

const TABS = [
  {
    key: 'cosas',
    label: 'Cosas',
    sublabel: 'Lo que se produce, imprime y entrega.',
    filter: (p: ProductSnippet) => !p.category.isService,
    catalogHref: '/productos?mode=product',
  },
  {
    key: 'desarrollos',
    label: 'Desarrollos',
    sublabel: 'Lo que se construye, instala y sostiene.',
    filter: (p: ProductSnippet) => p.category.isService,
    catalogHref: '/productos?mode=product',
  },
] as const

export default function CatalogEntrySection({
  products,
}: {
  products: ProductSnippet[]
}) {
  const cosas = products.filter((p) => !p.category.isService).slice(0, 4)
  const desarrollos = products.filter((p) => p.category.isService).slice(0, 4)

  const hasBoth = cosas.length > 0 && desarrollos.length > 0
  const hasAny = cosas.length > 0 || desarrollos.length > 0

  if (!hasAny) return null

  return (
    <section className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
            Catálogo
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            {hasBoth
              ? 'Cosas que se producen. Desarrollos que se construyen.'
              : cosas.length > 0
              ? 'Cosas que se producen.'
              : 'Desarrollos que se construyen.'}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-gray-500">
            Elegí por lo que necesitás resolver, no por categoría.
          </p>
        </div>
        <Link
          href="/productos"
          className="shrink-0 text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]"
        >
          Ver catálogo completo <ArrowRight size={14} className="inline" />
        </Link>
      </div>

      {/* Two-column layout when both types exist */}
      <div className={hasBoth ? 'grid gap-8 lg:grid-cols-2' : ''}>
        {TABS.map(({ key, label, sublabel, filter, catalogHref }) => {
          const items = products.filter(filter).slice(0, 4)
          if (items.length === 0) return null

          return (
            <div key={key}>
              {/* Tab label */}
              <div className="mb-4 flex items-baseline gap-3">
                <h3 className="text-xl font-black text-gray-950">{label}</h3>
                <span className="text-sm text-gray-400">{sublabel}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((product) => {
                  const displayPrice = getProductDisplayPrice(product as any)
                  const requiresConfig =
                    product.variants.length > 0 || Boolean(product.quoterConfig)

                  return (
                    <Link
                      key={product.id}
                      href={`/productos/${product.slug}`}
                      className="group flex flex-col gap-3 overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-[0_12px_40px_-30px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:border-[#F7638B]/25 hover:shadow-[0_18px_50px_-32px_rgba(237,22,79,0.12)]"
                    >
                      <div className="relative aspect-[1.4/1] overflow-hidden bg-gray-100">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl font-black text-gray-300">
                            Z
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 px-4 pb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
                          {product.category.name}
                        </p>
                        <p className="text-base font-black text-gray-950 transition-colors group-hover:text-[#ED164F]">
                          {product.name}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-gray-700">
                          {displayPrice !== null
                            ? `${requiresConfig ? 'Desde ' : ''}$${displayPrice.toLocaleString('es-AR')}`
                            : 'Consultar'}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>

              <div className="mt-4 text-right">
                <Link
                  href={catalogHref}
                  className="text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]"
                >
                  Ver todo en {label.toLowerCase()}{' '}
                  <ArrowRight size={13} className="inline" />
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
