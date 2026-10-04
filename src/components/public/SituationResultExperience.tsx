import Link from 'next/link'

interface ProductItem {
  id: string
  name: string
  slug: string
  description: string | null
  quoterConfig?: unknown | null
  category?: { name: string; isService: boolean } | null
}

interface SituationData {
  id: string
  name: string
  slug: string
  description?: string | null
  needs?: {
    id: string
    name: string
    slug: string
    description?: string | null
  }[]
}

interface BusinessTypeData {
  id: string
  name: string
  slug: string
}

function getHeadline(situationName: string): string {
  const lower = situationName.toLowerCase().trim()
  if (lower.startsWith('quiero llenar ')) {
    return `Para llenar ${lower.replace('quiero llenar ', '')}, primero...`
  }
  if (lower.startsWith('quiero ')) {
    return `Para ${lower.replace('quiero ', '')}, primero...`
  }
  if (lower.startsWith('estoy por ')) {
    return `Para ${lower.replace('estoy por ', '')}, primero...`
  }
  if (lower.startsWith('tengo un ')) {
    return `Para tu ${lower.replace('tengo un ', '')}, primero...`
  }
  return `Para ${lower}, primero...`
}

export default function SituationResultExperience({
  situation,
  businessType,
  products = [],
  whatsappNumber,
}: {
  situation: SituationData
  businessType?: BusinessTypeData | null
  products: ProductItem[]
  whatsappNumber?: string | null
}) {
  const rubroName = businessType?.name || 'Tu negocio'
  const situationName = situation.name
  const headline = getHeadline(situationName)

  const defaultWhatsapp = whatsappNumber || '+541125832323'
  const buildWaUrl = (text: string) =>
    `https://wa.me/${defaultWhatsapp.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(text)}`

  // Specific prototype match for gym & yoga / llenar horarios
  const isGymLlenarHorarios =
    (businessType?.slug === 'gym-y-yoga' || !businessType) &&
    (situation.slug === 'quiero-llenar-horarios' || situation.slug === 'estoy-por-abrir')

  // Build step 1 items
  const physicalProducts = products.filter((p) => !p.category?.isService)
  const serviceProducts = products.filter((p) => p.category?.isService)

  const step1Items = isGymLlenarHorarios
    ? [
        {
          id: 'flyers',
          title: 'Flyers',
          description: 'Horarios y cupos en una pieza que se lleva.',
          buttonLabel: 'Configurar',
          buttonType: 'primary' as const,
          href: '/productos?mode=product&cat=flyers-y-folletos',
        },
        {
          id: 'posters',
          title: 'Posters',
          description: 'Para el espacio y la vidriera.',
          buttonLabel: 'Configurar',
          buttonType: 'primary' as const,
          href: '/productos?mode=product&cat=carteleria',
        },
        {
          id: 'posteo',
          title: 'Posteo para redes',
          description: 'Horarios y cupos listos para publicar.',
          buttonLabel: 'Agregar',
          buttonType: 'primary' as const,
          href: '/productos?mode=product&cat=diseno',
        },
      ]
    : physicalProducts.slice(0, 4).map((p) => ({
        id: p.id,
        title: p.name,
        description: p.description || 'Configuración y producción a medida.',
        buttonLabel: p.quoterConfig ? 'Configurar' : 'Agregar',
        buttonType: 'primary' as const,
        href: `/productos/${p.slug}`,
      }))

  const step2Items = isGymLlenarHorarios
    ? [
        {
          id: 'campana',
          title: 'Campaña para redes',
          description: 'Para sostener la demanda en el tiempo.',
          buttonLabel: 'Consultar',
          buttonType: 'outline' as const,
          href: buildWaUrl(
            `Hola ZAP! Quisiera consultar por Campaña para redes para mi negocio de ${rubroName} (${situationName}).`
          ),
          isExternal: true,
        },
        {
          id: 'video',
          title: 'Video publicitario',
          description: 'Una pieza para mostrar tu propuesta.',
          buttonLabel: 'Consultar',
          buttonType: 'outline' as const,
          href: buildWaUrl(
            `Hola ZAP! Quisiera consultar por Video publicitario para mi negocio de ${rubroName} (${situationName}).`
          ),
          isExternal: true,
        },
      ]
    : serviceProducts.length > 0
    ? serviceProducts.slice(0, 3).map((p) => ({
        id: p.id,
        title: p.name,
        description: p.description || 'Servicio estratégico para tu marca.',
        buttonLabel: 'Consultar',
        buttonType: 'outline' as const,
        href: buildWaUrl(
          `Hola ZAP! Quisiera consultar por ${p.name} para mi negocio de ${rubroName} (${situationName}).`
        ),
        isExternal: true,
      }))
    : [
        {
          id: 'campana-gen',
          title: 'Campaña de difusión y presencia',
          description: 'Para sostener la demanda en el tiempo.',
          buttonLabel: 'Consultar',
          buttonType: 'outline' as const,
          href: buildWaUrl(
            `Hola ZAP! Quisiera consultar por campaña y difusión para mi negocio de ${rubroName} (${situationName}).`
          ),
          isExternal: true,
        },
      ]

  const step3WaUrl = buildWaUrl(
    `Hola ZAP! Estuve viendo la tienda para mi negocio de ${rubroName} (${situationName}) y me gustaría conversar para entender dónde están las mejores oportunidades.`
  )

  return (
    <div className="bg-white min-h-screen">
      <div className="mx-auto max-w-[1380px] px-4 py-10 sm:py-16 xl:px-8">
        {/* Context Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-8 sm:mb-12 font-medium">
          <span className="text-gray-900">{rubroName}</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-900">{situationName}</span>
          <span className="text-gray-300">·</span>
          <Link
            href="/"
            className="text-gray-950 font-bold underline underline-offset-4 hover:text-[#ED164F] transition-colors ml-1"
          >
            Cambiar
          </Link>
        </div>

        {/* Big H1 Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-[76px] font-black tracking-tight text-gray-950 leading-[1.08] max-w-4xl mb-14 sm:mb-20">
          {headline}
        </h1>

        {/* ── STEP 01 ────────────────────────────────────────────── */}
        <div className="py-12 sm:py-16 border-t border-gray-200">
          <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_1fr]">
            <div>
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-400 block mb-2">
                01
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 leading-tight">
                {isGymLlenarHorarios
                  ? 'Hacé visible tu disponibilidad'
                  : situation.needs?.[0]?.name || 'Hacé visible tu propuesta'}
              </h2>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {step1Items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2"
                >
                  <div className="max-w-xl">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-950">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={item.href}
                      className="inline-flex items-center justify-center rounded-xl bg-[#ED164F] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#C2103F] active:scale-[0.98] min-w-[130px] text-center"
                    >
                      {item.buttonLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STEP 02 ────────────────────────────────────────────── */}
        <div className="py-12 sm:py-16 border-t border-gray-200">
          <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_1fr]">
            <div>
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-400 block mb-2">
                02
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 leading-tight">
                {isGymLlenarHorarios
                  ? 'Generá demanda'
                  : situation.needs?.[1]?.name || 'Generá demanda sostenida'}
              </h2>
            </div>

            <div className="space-y-6 sm:space-y-8">
              {step2Items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2"
                >
                  <div className="max-w-xl">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-950">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <Link
                      href={item.href}
                      target={item.isExternal ? '_blank' : undefined}
                      rel={item.isExternal ? 'noopener noreferrer' : undefined}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-900 bg-white px-8 py-3 text-sm font-bold text-gray-950 transition-all hover:bg-gray-50 active:scale-[0.98] min-w-[130px] text-center"
                    >
                      {item.buttonLabel}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── STEP 03 ────────────────────────────────────────────── */}
        <div className="py-12 sm:py-16 border-t border-b border-gray-200">
          <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_1fr]">
            <div>
              <span className="text-xs sm:text-sm font-mono font-bold text-gray-400 block mb-2">
                03
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 leading-tight">
                Entendé dónde están las oportunidades
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
              <div className="max-w-xl">
                <h3 className="text-lg sm:text-xl font-bold text-gray-950">
                  Esto conviene conversarlo primero.
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  No hay una oferta cerrada para esto. Lo vemos con vos.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={step3WaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-gray-900 bg-white px-8 py-3 text-sm font-bold text-gray-950 transition-all hover:bg-gray-50 active:scale-[0.98] min-w-[150px] text-center"
                >
                  Hablar con ZAP
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
