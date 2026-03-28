import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Link2 } from 'lucide-react'
import { getProductDisplayPrice } from '@/lib/product-pricing'

type RelatedProduct = {
  id: string
  name: string
  slug: string
  description?: string | null
  price: number
  images: string[]
  active: boolean
  category: {
    name: string
  }
  variants: Array<{
    price: number
  }>
}

export default function RelatedProductsSection({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="mt-14">
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <Link2 size={18} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tambien te puede interesar</h2>
          <p className="text-sm text-gray-500">
            Productos vinculados para completar este trabajo.
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const displayPrice = getProductDisplayPrice(product)

          return (
            <Link
              key={product.id}
              href={`/productos/${product.slug}`}
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
                  <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
                    IMG
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div>
                  <p className="mb-1 text-xs font-semibold text-orange-500">{product.category.name}</p>
                  <h3 className="line-clamp-2 text-base font-bold text-gray-900">{product.name}</h3>
                </div>

                {product.description && (
                  <p className="line-clamp-2 text-sm text-gray-500">{product.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    {product.variants.length > 0 && displayPrice !== null && (
                      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Desde
                      </p>
                    )}
                    <p className="text-lg font-bold text-gray-900">
                      {displayPrice !== null ? `$${displayPrice.toLocaleString('es-AR')}` : 'Consultar'}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
                    Ver producto
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
