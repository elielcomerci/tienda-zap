import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Link2 } from 'lucide-react'
import { getProductDisplayPrice } from '@/lib/product-pricing'
import { buildProductUrl, type ExplorationContext } from '@/lib/exploration-context'
import ProductImagePlaceholder from '@/components/public/ProductImagePlaceholder'

type RelatedProduct = {
  relationType: 'UPSELL' | 'COMPLEMENTARY' | 'ALTERNATIVE'
  id: string
  name: string
  slug: string
  description?: string | null
  purpose?: string | null
  whatIs?: string | null
  price: number
  images: string[]
  active: boolean
  modality: 'CONFIGURABLE' | 'DIRECTO' | 'CONSULTAR'
  catalogType: 'COSA' | 'DESARROLLO'
  engine: 'IMPRESOS_PACKAGING' | 'PRESENCIA_FISICA' | 'TEXTIL' | 'DIGITAL' | 'CAMPANAS' | null
  variants: Array<{
    price: number
  }>
  quoterConfig?: any
}

export default function RelatedProductsSection({
  products,
  context,
}: {
  products: RelatedProduct[]
  context?: ExplorationContext
}) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF1F5] text-[#ED164F]">
          <Link2 size={18} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            También puede interesarte
          </h2>
          <p className="text-sm text-gray-500">
            Alternativas y complementos que ZAP seleccionó para esta propuesta.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const displayPrice = getProductDisplayPrice(product)
          const requiresConfiguration = product.variants.length > 0 || Boolean(product.quoterConfig)

          return (
            <Link
              key={product.id}
              href={buildProductUrl(product.slug, context)}
              className="card group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden bg-gray-100">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <ProductImagePlaceholder label={`Imagen de ${product.name}`} />
                )}
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="mb-1 text-xs font-semibold text-[#ED164F]">{product.relationType === 'UPSELL' ? 'Una opción más completa' : product.relationType === 'ALTERNATIVE' ? 'Una alternativa' : 'Un buen complemento'}</p>
                  <h3 className="line-clamp-2 text-base font-bold text-gray-900">{product.name}</h3>
                </div>

                {(product.description?.trim() || product.purpose?.trim() || product.whatIs?.trim()) && (
                  <p className="line-clamp-2 text-sm text-gray-500">
                    {product.description?.trim() || product.purpose?.trim() || product.whatIs?.trim()}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    {requiresConfiguration && displayPrice !== null && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Desde
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900">
                      {displayPrice !== null ? `$${displayPrice.toLocaleString('es-AR')}` : 'Consultar'}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#ED164F]">
                    {product.relationType === 'UPSELL' ? 'Ver opción' : product.relationType === 'ALTERNATIVE' ? 'Ver alternativa' : 'Ver complemento'}
                    <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
