import Link from 'next/link'
import { ArrowRight, Package2 } from 'lucide-react'
import { getProductDisplayPrice } from '@/lib/product-pricing'

/**
 * Slugs de los packs que se muestran en la home (máx. 3, en ese orden).
 * Si el slug no existe en la DB, se omite silenciosamente.
 * Si la lista está vacía o no matchea nada, se usan los primeros 3 de la DB.
 */
const FEATURED_COMBO_SLUGS: string[] = [
  'pack-gastronomia',
  'pack-retail',
  'pack-eventos',
]

export interface ComboItem {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  isCombo: boolean
  price: number
  targetBusinessTypes: { id: string; name: string; slug: string }[]
  variants: { price: number }[]
  outgoingRelations: {
    relatedProduct: {
      id: string
      name: string
      images: string[]
      category: { name: string }
      variants: { price: number }[]
    }
  }[]
}

export default function ComboSection({
  combos,
  businessTypeName,
}: {
  combos: any[]
  businessTypeName?: string | null
}) {
  const typedCombos = combos as unknown as ComboItem[]

  if (typedCombos.length === 0) return null

  // Selección de packs: prioriza FEATURED_COMBO_SLUGS, si no hay matches usa los primeros 3
  const featured = FEATURED_COMBO_SLUGS
    .map((slug) => typedCombos.find((c) => c.slug === slug))
    .filter((c): c is ComboItem => c !== undefined)

  const displayed = (featured.length > 0 ? featured : typedCombos).slice(0, 3)

  return (
    <section className="border-y border-[#F7638B]/15 bg-gradient-to-br from-[#fff8fb] via-white to-[#f0f5ff]">
      <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED164F]">
              {businessTypeName ? `Soluciones para ${businessTypeName}` : 'Soluciones'}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              {businessTypeName
                ? `Todo lo que necesita tu ${businessTypeName.toLowerCase()} en un solo pedido.`
                : 'Soluciones completas para situaciones concretas.'}
            </h2>
          </div>
          <Link
            href="/productos?mode=combo"
            className="shrink-0 text-sm font-semibold text-[#ED164F] hover:text-[#C2103F]"
          >
            Ver todos los packs <ArrowRight size={14} className="inline" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayed.map((combo) => {
            const displayPrice = getProductDisplayPrice(combo)
            // Quita el prefijo "Pack " del nombre si ya está en el nombre del combo
            // para evitar "Pack Pack Gastronomía"
            const displayName = combo.name.toLowerCase().startsWith('pack pack ')
              ? combo.name.replace(/^pack /i, '')
              : combo.name

            return (
              <Link
                key={combo.id}
                href={`/productos/${combo.slug}`}
                className="group relative overflow-hidden rounded-[30px] border border-[#F7638B]/20 bg-white shadow-[0_18px_50px_-42px_rgba(237,22,79,0.15)] transition-all hover:-translate-y-1 hover:border-[#F7638B]/40 hover:shadow-[0_28px_70px_-44px_rgba(237,22,79,0.25)]"
              >
                {/* Badge */}
                <div className="absolute right-4 top-4 z-10 rounded-full bg-[#ED164F] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                  Pack
                </div>

                {/* Image */}
                <div className="relative aspect-[1.4/1] overflow-hidden bg-gradient-to-br from-[#FEF1F5] to-[#F0F5FF]">
                  {combo.images[0] ? (
                    <img
                      src={combo.images[0]}
                      alt={displayName}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package2 size={48} className="text-[#F7638B]/40" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-black tracking-tight text-gray-950 transition-colors group-hover:text-[#ED164F]">
                    {displayName}
                  </h3>
                  {combo.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                      {combo.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-end justify-between border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                        Precio del pack
                      </p>
                      <p className="mt-1 text-2xl font-black text-gray-950">
                        {displayPrice !== null
                          ? `$${displayPrice.toLocaleString('es-AR')}`
                          : 'Consultar'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-semibold text-[#ED164F]">
                      Ver solución <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
