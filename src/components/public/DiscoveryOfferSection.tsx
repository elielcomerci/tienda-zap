import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getProductFamilyLabel, getProductModalityLabel, isServiceProduct } from '@/lib/catalog-domain'

type OfferProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  purpose?: string | null
  whatIs?: string | null
  modality: 'DIRECTO' | 'CONFIGURABLE' | 'CONSULTAR'
  engine: 'IMPRESOS_PACKAGING' | 'PRESENCIA_FISICA' | 'TEXTIL' | 'DIGITAL' | 'CAMPANAS' | null
}

export default function DiscoveryOfferSection({
  products,
  needName,
}: {
  products: OfferProduct[]
  needName: string
}) {
  const offers = products.slice(0, 4)
  const engines = new Set(offers.map((product) => product.engine).filter(Boolean))
  const includesDevelopment = offers.some((product) => isServiceProduct(product))
  const needsZAPReview = offers.length >= 3 && includesDevelopment && engines.size > 1

  if (offers.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          ZAP
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">
          No todo tiene una respuesta prefabricada.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, no queremos inventarte una oferta.
          Podemos mirar qué está pasando y decidir con vos dónde tiene sentido intervenir.
        </p>
        <Link
          href="/contacto"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-5 py-3 text-sm font-bold text-white"
        >
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  if (needsZAPReview) {
    return (
      <section className="rounded-[28px] border border-[#F7638B]/20 bg-[#fff9fb] p-6 shadow-[0_18px_50px_-42px_rgba(237,22,79,0.18)] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C2103F]">
          Paso 3 · Recomendación
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
          Esto conviene mirarlo como un conjunto
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, hay varias formas de intervenir y probablemente tengan que trabajar juntas.
          Antes de hacerte elegir una cosa, podemos mirar el contexto y decirte por dónde tiene más sentido empezar.
        </p>
        <Link
          href="/contacto"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-5 py-3 text-sm font-bold text-white"
        >
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.24)] sm:p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C2103F]">
          Paso 3 · Recomendación
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
          Esto puede servirte
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Partimos de <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>.
          No es todo lo que hacemos: son algunas formas concretas en las que podemos intervenir sobre eso.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((product) => {
          const isDevelopment = isServiceProduct(product)
          const typeLabel = isDevelopment ? 'Desarrollo' : 'Cosa'
          const explanation =
            product.purpose?.trim() ||
            product.whatIs?.trim() ||
            product.description?.trim() ||
            'Una forma concreta de avanzar sobre esta necesidad.'

          return (
            <article key={product.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-600">
                    {typeLabel}
                  </span>
                  <h3 className="mt-3 text-lg font-black text-gray-950">{product.name}</h3>
                </div>
                <span className="shrink-0 text-[11px] font-semibold text-gray-400">
                  {getProductFamilyLabel(product)}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                  Por qué aparece acá
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{explanation}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
                <span className="text-xs font-semibold text-gray-500">
                  {getProductModalityLabel(product.modality)}
                </span>
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
