import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { isDevelopment } from '@/lib/catalog-domain'

type ContextualProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  catalogType: 'COSA' | 'DESARROLLO'
  purpose?: string | null
  whatIs?: string | null
  modality: 'DIRECTO' | 'CONFIGURABLE' | 'CONSULTAR'
  engine: 'IMPRESOS_PACKAGING' | 'PRESENCIA_FISICA' | 'TEXTIL' | 'DIGITAL' | 'CAMPANAS' | null
}

export default function DiscoveryAdjacentSection({
  products,
  selectedProductIds,
}: {
  products: ContextualProduct[]
  selectedProductIds: string[]
}) {
  const selected = new Set(selectedProductIds)
  const recommendations = products
    .filter((product) => !selected.has(product.id) && !isDevelopment(product))
    .filter((product) => product.purpose?.trim() || product.whatIs?.trim() || product.description?.trim())
    .slice(0, 4)

  if (recommendations.length === 0) return null

  return (
    <section className="px-1 pb-2 sm:px-2">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">También puede servirte</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">Otras cosas que pueden tener sentido para tu negocio.</p>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2 sm:gap-4">
        {recommendations.map((product) => {
          const explanation =
            product.purpose?.trim() ||
            product.whatIs?.trim() ||
            product.description?.trim() ||
            'Una forma concreta de avanzar sobre una necesidad de tu negocio.'

          return (
            <article key={product.id} className="flex min-h-[154px] flex-col rounded-[22px] bg-white/80 p-5 shadow-[0_14px_36px_-32px_rgba(15,23,42,0.2)] sm:p-6">
              <h3 className="text-lg font-black tracking-tight text-gray-950 sm:text-xl">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{explanation}</p>

              <Link
                href={`/productos/${product.slug}`}
                className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]"
              >
                Ver más <ArrowRight size={15} />
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}