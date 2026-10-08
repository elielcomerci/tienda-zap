import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { isDevelopment } from '@/lib/catalog-domain'
import { buildProductUrl } from '@/lib/exploration-context'
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
  businessTypeName,
  situationName,
  businessTypeSlug,
  situationSlug,
  needSlug,
}: {
  products: OfferProduct[]
  needName: string
  businessTypeName?: string
  situationName?: string
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
  const whatsappMessage = [
    `Hola, necesito orientación para resolver: ${needName}.`,
    businessTypeName ? `Mi rubro es ${businessTypeName}.` : null,
    situationName ? `Mi situación actual es: ${situationName}.` : null,
  ].filter(Boolean).join('\n')
  const whatsappUrl = buildWhatsappUrl(undefined, whatsappMessage)

  if (offers.length === 0) {
    return (
      <section className="rounded-[30px] bg-white px-5 py-8 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.24)] sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">ZAP</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">No todo tiene una respuesta prefabricada.</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, no queremos inventarte una oferta.
          Podemos mirar qué está pasando y decidir con vos dónde tiene sentido intervenir.
        </p>
        <Link href={whatsappUrl || "/"} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ED164F] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(237,22,79,0.55)] transition-transform hover:-translate-y-0.5">
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  if (needsZAPReview) {
    return (
      <section id="recomendacion" className="rounded-[30px] bg-[linear-gradient(135deg,#fff9fb_0%,#ffffff_75%)] px-5 py-8 sm:px-8 sm:py-10">
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Esto conviene mirarlo como un conjunto</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Para <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>, hay varias formas de intervenir y probablemente tengan que trabajar juntas.
          Antes de hacerte elegir una cosa, podemos mirar el contexto y decirte por dónde tiene más sentido empezar.
        </p>
        <Link href={whatsappUrl || "/" } className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ED164F] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(237,22,79,0.55)] transition-transform hover:-translate-y-0.5">
          Hablar con ZAP <ArrowRight size={16} />
        </Link>
      </section>
    )
  }

  return (
    <section id="recomendacion" className="rounded-[30px] bg-white px-5 py-7 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.28)] sm:px-8 sm:py-9">
      <div className="mb-7 max-w-2xl">
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">Esto puede servirte</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
          Partimos de <span className="font-semibold text-gray-900">{needName.toLowerCase()}</span>.
          Estas son algunas formas concretas de intervenir.
        </p>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2 sm:gap-4">
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
          const actionLabel = isDevelopment(product)
            ? 'Ver desarrollo'
            : product.modality === 'CONFIGURABLE'
              ? 'Configurar'
              : product.modality === 'CONSULTAR'
                ? 'Hablar con ZAP'
                : 'Ver producto'

          return (
            <article key={product.id} className="flex min-h-[178px] flex-col rounded-[22px] bg-gray-50/80 p-5 sm:p-6">
              <h3 className="text-lg font-black tracking-tight text-gray-950 sm:text-xl">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{explanation}</p>

              <Link
                href={buildProductUrl(product.slug, {
                  mode: 'situation',
                  businessTypeSlug,
                  situationSlug,
                  needSlug,
                })}
                className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]"
              >
                {actionLabel} <ArrowRight size={15} />
              </Link>
            </article>
          )
        })}
      </div>

      <div className="mt-7 flex justify-start border-t border-gray-100 pt-5 sm:justify-end">
        <Link href={whatsappUrl || "/"} className="inline-flex items-center gap-2 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]">
          ¿No sabés cuál elegir? Hablemos <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  )
}
