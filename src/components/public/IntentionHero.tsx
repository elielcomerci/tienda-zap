import type { DiscoverySituation } from '@/lib/discovery'

const SITUATION_LEADS: Record<string, string> = {
  'estoy-por-abrir': 'Cada apertura tiene sus propios desafíos.',
  'quiero-conseguir-mas-pedidos':
    'Conseguir más pedidos empieza por darles más motivos para elegirte.',
  'quiero-vender-mas-en-el-local':
    'Vender más en el local también depende de cómo presentás tu propuesta.',
  'quiero-que-mis-clientes-vuelvan':
    'Para que tus clientes vuelvan, la experiencia tiene que darles un motivo.',
  'quiero-que-mi-comida-se-vea-mejor': 'Tu comida merece verse tan bien como sabe.',
  'quiero-que-mi-marca-se-vea-mejor':
    'Una marca se reconoce cuando todo lo que muestra habla el mismo idioma.',
  'quiero-vender-o-alquilar-mas':
    'Cada propiedad tiene algo que destacar. Hagamos que llegue a quien la busca.',
  'quiero-ordenar-mi-negocio':
    'Ordenar el negocio empieza por distinguir lo urgente de lo importante.',
  'quiero-vender-online':
    'Vender online necesita una experiencia clara, confiable y fácil de recorrer.',
  'quiero-renovar-la-marca-o-el-espacio':
    'Renovar es una oportunidad para alinear lo que sos con lo que mostrás.',
  'estoy-abriendo-o-renovando-la-inmobiliaria':
    'La forma en que se presenta tu inmobiliaria también construye confianza.',
  'quiero-captar-propiedades':
    'Captar propiedades empieza por mostrar por qué confiar en vos.',
  'quiero-conseguir-mas-consultas':
    'Más consultas empiezan cuando tu propuesta llega a las personas indicadas.',
  'quiero-transmitir-mas-confianza':
    'La confianza se construye en cada detalle de tu marca y de la experiencia.',
  'quiero-llenar-la-agenda':
    'Una agenda más completa empieza por hacer visible tu propuesta.',
  'quiero-que-me-encuentren':
    'Tus clientes tienen que encontrarte donde empiezan a buscar.',
  'quiero-vender-mas':
    'Vender más empieza por conectar mejor tu propuesta con quienes la necesitan.',
  'quiero-renovar-el-local':
    'Tu local puede contar mejor lo que hace especial a tu negocio.',
  'tengo-un-evento': 'Un evento empieza mucho antes de que llegue la gente.',
  'quiero-atraer-gente-al-evento-o-stand':
    'Atraer gente es el primer paso; la experiencia invita a quedarse.',
  'quiero-generar-contactos':
    'Los buenos contactos empiezan con una propuesta que invita a acercarse.',
  'quiero-conseguir-alumnos':
    'Conseguir alumnos empieza por mostrar qué hace valiosa tu propuesta.',
  'quiero-mejorar-mi-espacio':
    'Un espacio bien pensado mejora la experiencia desde que alguien entra.',
}

const DEFAULT_LEAD = 'Cada negocio tiene su propio punto de partida.'
const DISCOVERY_QUESTION = '¿Qué necesitás resolver primero?'

export default function IntentionHero({
  intention,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {
  const lead =
    SITUATION_LEADS[intention.slug] ||
    intention.description ||
    DEFAULT_LEAD

  return (
    <section className="border-b border-gray-200/80 pb-8 sm:pb-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl leading-[1.12] tracking-[-0.035em] text-gray-950 sm:text-5xl sm:leading-[1.08]">
          <span className="block font-medium">{lead}</span>
          <span className="mt-1 block font-semibold sm:mt-1.5">
            {DISCOVERY_QUESTION}
          </span>
        </h1>
      </div>
    </section>
  )
}
