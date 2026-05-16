import Link from 'next/link'
import { ArrowRight, Package2 } from 'lucide-react'
import { getProductDisplayPrice } from '@/lib/product-pricing'

type Combo = {
  id: string
  name: string
  slug: string
  description: string | null
  images: string[]
  isCombo: boolean
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
  combos: Combo[]
  businessTypeName?: string | null
}) {
  if (combos.length === 0) return null

  return (
    <section className="border-y border-[#F66B9A]/15 bg-gradient-to-br from-[#fff8fb] via-white to-[#f0f5ff]">
      <div className="mx-auto max-w-[1380px] px-4 py-14 xl:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ED2C71]">
              {businessTypeName ? `Pack exclusivo para ${businessTypeName}` : 'Packs especiales'}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              {businessTypeName
                ? `Todo lo que necesita tu ${businessTypeName.toLowerCase()} en un solo pedido.`
                : 'Soluciones completas a precio especial.'}
            </h2>
            {!businessTypeName && (
              <p className="mt-2 text-sm text-gray-500">
                <Link href="/registro" className="underline hover:text-[#ED2C71]">Registrá tu negocio</Link>{' '}
                para ver los packs pensados para tu rubro.
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {combos.map((combo) => {
            const displayPrice = getProductDisplayPrice(combo)
            const includedItems = combo.outgoingRelations.slice(0, 4)

            return (
              <Link
                key={combo.id}
                href={`/productos/${combo.slug}`}
                className="group relative overflow-hidden rounded-[30px] border border-[#F66B9A]/20 bg-white shadow-[0_18px_50px_-42px_rgba(237,44,113,0.15)] transition-all hover:-translate-y-1 hover:border-[#F66B9A]/40 hover:shadow-[0_28px_70px_-44px_rgba(237,44,113,0.25)]"
              >
                {/* Badge */}
                <div className="absolute right-4 top-4 z-10 rounded-full bg-[#ED2C71] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                  Pack
                </div>

                {/* Image */}
                <div className="relative aspect-[1.4/1] overflow-hidden bg-gradient-to-br from-[#FEF1F6] to-[#F0F5FF]">
                  {combo.images[0] ? (
                    <img
                      src={combo.images[0]}
                      alt={combo.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package2 size={48} className="text-[#F66B9A]/40" />
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="text-xl font-black tracking-tight text-gray-950 transition-colors group-hover:text-[#ED2C71]">
                    {combo.name}
                  </h3>

                  {/* Included items */}
                  {includedItems.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {includedItems.map(({ relatedProduct }) => (
                        <div key={relatedProduct.id} className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="text-[#ED2C71]">✓</span>
                          {relatedProduct.name}
                        </div>
                      ))}
                      {combo.outgoingRelations.length > 4 && (
                        <p className="text-xs text-gray-400">
                          + {combo.outgoingRelations.length - 4} más incluidos
                        </p>
                      )}
                    </div>
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
                    <span className="flex items-center gap-1 text-sm font-semibold text-[#ED2C71]">
                      Ver pack <ArrowRight size={14} />
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
