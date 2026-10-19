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

const EXPLORATION_PRODUCT_NAMES: Record<string, string> = {
  'activos-web-sitios': 'Sitios web y catálogos digitales',
  'sistema-identidad': 'Identidad de marca',
  'asistentes-bots': 'Asistentes para consultas',
  'operaciones-consultoria': 'Procesos y organización del negocio',
  'sistema-captacion-eventos': 'Captación de contactos para eventos',
  'diseno-pack-graficos-redes': 'Diseño de 10 piezas para redes',
}

function getExplorationProductName(product: OfferProduct) {
  return EXPLORATION_PRODUCT_NAMES[product.slug] || product.name
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
  const whatsappMessage = [
    `Hola, necesito orientación para resolver: ${needName}.`,
    businessTypeName ? `Mi rubro es ${businessTypeName}.` : null,
    situationName ? `Mi situación actual es: ${situationName}.` : null,
  ].filter(Boolean).join('\n')
  const whatsappUrl = buildWhatsappUrl(undefined, whatsappMessage)

  if (offers.length === 0) {
    return (
      <section id="recomendacion" className="rounded-2xl border border-gray-200 bg-white px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">ZAP</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950">Lo vemos con vos.</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
          Conversemos sobre qué tiene sentido hacer en tu negocio.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link href={whatsappUrl || "/"} className="inline-flex items-center gap-2 rounded-full bg-[#ED164F] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_-14px_rgba(237,22,79,0.55)] transition-transform hover:-translate-y-0.5">
            Hablar con ZAP <ArrowRight size={16} />
          </Link>
          <Link href="#necesidades" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C2103F] hover:text-[#ED164F]">
            Elegir otra necesidad <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    )
  }


  return (
    <section id="recomendacion" className="border-t border-gray-200 pt-5">
      {offers.length > 1 && (
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-gray-950">Opciones para avanzar</h2>
      )}

      <div className={`grid gap-4 ${offers.length > 1 ? 'md:grid-cols-2' : ''}`}>
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
            <article key={product.id} className="flex flex-col border-b border-gray-100 pb-5">
              <h3 className="text-base font-bold tracking-tight text-gray-950 sm:text-lg">{getExplorationProductName(product)}</h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-5 text-gray-600">{explanation}</p>

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


    </section>
  )
}
