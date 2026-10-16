import type { DiscoverySituation } from '@/lib/discovery'

const SITUATION_CONTEXTS: Record<string, string> = {
  'estoy-por-abrir': 'Estás por abrir',
  'quiero-conseguir-mas-pedidos': 'Más pedidos',
  'quiero-vender-mas-en-el-local': 'Ventas en el local',
  'quiero-que-mis-clientes-vuelvan': 'Clientes que vuelven',
  'quiero-que-mi-comida-se-vea-mejor': 'Tu propuesta gastronómica',
  'quiero-que-mi-marca-se-vea-mejor': 'Tu marca',
  'quiero-vender-o-alquilar-mas': 'Ventas y alquileres',
  'quiero-ordenar-mi-negocio': 'Ordenar el negocio',
  'quiero-vender-online': 'Venta online',
  'quiero-renovar-la-marca-o-el-espacio': 'Renovar tu marca o espacio',
  'estoy-abriendo-o-renovando-la-inmobiliaria': 'Tu inmobiliaria',
  'quiero-captar-propiedades': 'Captación de propiedades',
  'quiero-conseguir-mas-consultas': 'Más consultas',
  'quiero-transmitir-mas-confianza': 'Transmitir confianza',
  'quiero-llenar-la-agenda': 'Llenar la agenda',
  'quiero-que-me-encuentren': 'Que te encuentren',
  'quiero-vender-mas': 'Vender más',
  'quiero-renovar-el-local': 'Renovar tu local',
  'tengo-un-evento': 'Tu evento',
  'quiero-atraer-gente-al-evento-o-stand': 'Convocatoria para tu evento',
  'quiero-generar-contactos': 'Generar contactos',
  'quiero-conseguir-alumnos': 'Conseguir alumnos',
  'quiero-mejorar-mi-espacio': 'Mejorar tu espacio',
}

const DEFAULT_CONTEXT = 'Tu negocio'
const DISCOVERY_QUESTION = '¿Qué necesitás resolver primero?'

export default function IntentionHero({
  intention,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {
  const context = SITUATION_CONTEXTS[intention.slug] || DEFAULT_CONTEXT

  return (
    <section className="border-b border-gray-200/80 pb-7 sm:pb-9">
      <div className="max-w-3xl">
        <p className="mb-2 text-sm font-medium leading-5 tracking-[-0.01em] text-gray-500 sm:mb-3 sm:text-base">
          {context}
        </p>
        <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-gray-950 sm:text-5xl sm:leading-[1.06]">
          {DISCOVERY_QUESTION}
        </h1>
      </div>
    </section>
  )
}
