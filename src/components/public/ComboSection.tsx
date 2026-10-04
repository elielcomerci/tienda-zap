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
    <section className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-[1380px] px-4 py-16 xl:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-950 flex items-baseline">
            <span className="text-gray-400 font-bold mr-3 text-lg sm:text-xl lg:text-2xl">01</span>
            Algunas cosas ya tienen sentido juntas.
          </h2>
          <Link
            href="/productos?mode=combo"
            className="text-sm font-semibold text-gray-600 hover:text-[#ED164F] transition-colors"
          >
            Ver todos los packs →
          </Link>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((combo) => {
            const displayPrice = getProductDisplayPrice(combo)
            const displayName = combo.name.toLowerCase().startsWith('pack pack ')
              ? combo.name.replace(/^pack /i, '')
              : combo.name

            return (
              <Link
                key={combo.id}
                href={`/productos/${combo.slug}`}
                className="group flex flex-col transition-all"
              >
                {/* Image container */}
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#EBECEF] mb-4">
                  {combo.images[0] ? (
                    <img
                      src={combo.images[0]}
                      alt={displayName}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400 text-sm font-medium">
                      [foto del pack]
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-950 group-hover:text-[#ED164F] transition-colors">
                      {displayName}
                    </h3>
                    {combo.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {combo.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-lg font-black text-gray-950">
                      {displayPrice !== null
                        ? `$${displayPrice.toLocaleString('es-AR')}`
                        : 'Consultar'}
                    </span>
                    <span className="text-sm font-bold text-gray-900 group-hover:text-[#ED164F] inline-flex items-center gap-1 transition-colors">
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
