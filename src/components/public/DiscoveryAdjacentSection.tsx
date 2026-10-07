import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getProductFamilyLabel, getProductModalityLabel, isDevelopment } from '@/lib/catalog-domain'

type ContextualProduct = {
  id: string
  name: string
  slug: string
  description: string | null
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
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.22)] sm:p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          Para seguir explorando
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
          También puede servirte
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Estas son otras cosas que podés resolver ahora. No son el siguiente paso que te recomendamos: aparecen porque también pueden tener un propósito dentro de tu negocio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recommendations.map((product) => {
          const explanation =
            product.purpose?.trim() ||
            product.whatIs?.trim() ||
            product.description?.trim() ||
            'Una forma concreta de avanzar sobre una necesidad de tu negocio.'

          return (
            <article key={product.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
                    {getProductFamilyLabel(product)}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-gray-950">{product.name}</h3>
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-gray-400">
                  {getProductModalityLabel(product.modality)}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-600">{explanation}</p>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <span className="text-xs font-semibold text-gray-500">Podés resolverlo ahora</span>
                <Link
                  href={`/productos/${product.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]"
                >
                  Ver más <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}