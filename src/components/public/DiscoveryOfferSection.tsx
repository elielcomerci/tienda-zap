import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { isDevelopment } from '@/lib/catalog-domain'
import { buildWhatsappUrl } from '@/lib/whatsapp'
import { getDiscoveryOfferReason } from '@/lib/discovery-offer-reasons'

type OfferProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  purpose?: string | null
  whatIs?: string | null
  modality: 'DIRECTO' | 'CONFIGURABLE' | 'CONSULTAR'
  engine: 'IMPRESOS_PACKAGING' | 'PRESENCIA_FISICA' | 'TEXTIL' | 'DIGITAL' | 'CAMPANAS' | null
  catalogType: 'COSA' | 'DESARROLLO'
}

function getOfferPriority(product: OfferProduct) {
  if (isDevelopment(product)) return 0
  if (product.modality === 'CONFIGURABLE') return 1
  if (product.modality === 'DIRECTO') return 2
  return 3
}

export default function DiscoveryOfferSection({
  products,
  needName,
  businessTypeSlug,
  situationSlug,
  needSlug,
}: {
  products: OfferProduct[]
  needName: string
  businessTypeSlug?: string
  situationSlug?: string
  needSlug?: string
}) {
  const offers = products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => getOfferPriority(a.product) - getOfferPriority(b.product) || a.index - b.index)
    .slice(0, 4)
    .map(({ product }) => product)
  const engines = new Set(offers.map((product) => product.engine).filter(Boolean))
  const includesDevelopment = offers.some((product) => isDevelopment(product))
  const needsZAPReview = offers.length >= 3 && includesDevelopment && engines.size > 1
  const whatsappUrl = buildWhatsappUrl(undefined, `Hola, necesito orientación para resolver: ${needName}.`)

  if (offers.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-gray-300 bg-white p-6 sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">ZAP</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">No todo tiene una respuesta prefabricada.</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, no queremos inventarte una oferta.
          Podemos mirar qué está pasando y decidir con vos dónde tiene sentido intervenir.
        </p>
        <Link href={whatsappUrl || "/"} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-5 py-3 text-sm font-bold text-white">
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  if (needsZAPReview) {
    return (
      <section id="recomendacion" className="rounded-[28px] border border-[#F7638B]/20 bg-[#fff9fb] p-6 shadow-[0_18px_50px_-42px_rgba(237,22,79,0.18)] sm:p-8">
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Esto conviene mirarlo como un conjunto</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, hay varias formas de intervenir y probablemente tengan que trabajar juntas.
          Antes de hacerte elegir una cosa, podemos mirar el contexto y decirte por dónde tiene más sentido empezar.
        </p>
        <Link href="/contacto" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ED164F] px-5 py-3 text-sm font-bold text-white">
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  return (
    <section id="recomendacion" className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.24)] sm:p-7">
      <div className="mb-6">
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Esto puede servirte</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          Partimos de <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>.
          No es todo lo que hacemos: son algunas formas concretas en las que podemos intervenir sobre eso.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((product) => {
          const offerReason = needSlug
            ? getDiscoveryOfferReason({
                businessTypeSlug,
                situationSlug,
                needSlug,
                productSlug: product.slug,
              })
            : null
          const explanation =
            offerReason ||
            product.purpose?.trim() ||
            product.whatIs?.trim() ||
            product.description?.trim() ||
            'Una forma concreta de avanzar sobre esta necesidad.'
          const actionLabel = product.modality === 'CONFIGURABLE'
            ? 'Configurar'
            : product.modality === 'CONSULTAR'
              ? 'Hablar con ZAP'
              : 'Ver producto'

          return (
            <article key={product.id} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
              <h3 className="text-lg font-black text-gray-950">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-700">{explanation}</p>

              <Link
                href={product.modality === 'CONSULTAR' ? (whatsappUrl || '/') : `/productos/${product.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]"
              >
                {actionLabel} <ArrowRight size={15} />
              </Link>
            </article>
          )
        })}
      </div>

      <div className="mt-6 flex justify-end border-t border-gray-200 pt-5">
        <Link href={whatsappUrl || "/"} className="inline-flex items-center gap-2 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]">
          ¿No sabés cuál elegir? Hablemos <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}
