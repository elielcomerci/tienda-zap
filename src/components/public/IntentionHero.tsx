import type { DiscoverySituation } from '@/lib/discovery'

const SITUATION_HEADLINES: Record<string, string> = {
  'estoy-por-abrir':
    'Cada apertura tiene sus propios desafíos. ¿Por dónde necesitás empezar?',
  'quiero-conseguir-mas-pedidos':
    'Conseguir más pedidos empieza por entender qué puede hacer que te elijan.',
  'quiero-vender-mas-en-el-local':
    'Vender más en el local también depende de cómo se ve, se entiende y se vive tu propuesta.',
  'quiero-que-mis-clientes-vuelvan':
    'Para que tus clientes vuelvan, cada experiencia tiene que darles un motivo.',
  'quiero-que-mi-comida-se-vea-mejor':
    'Tu comida merece verse tan bien como sabe.',
  'quiero-que-mi-marca-se-vea-mejor':
    'Una marca se reconoce cuando todo lo que muestra habla el mismo idioma.',
  'quiero-vender-o-alquilar-mas':
    'Cada propiedad tiene algo que destacar. Hagamos que llegue a más personas.',
  'quiero-ordenar-mi-negocio':
    'Ordenar el negocio empieza por ver qué necesita atención y qué puede mejorar.',
  'quiero-vender-online':
    'Vender online necesita más que publicar productos: necesita una experiencia clara y confiable.',
  'quiero-renovar-la-marca-o-el-espacio':
    'Renovar es una oportunidad para alinear lo que sos con lo que mostrás.',
  'estoy-abriendo-o-renovando-la-inmobiliaria':
    'Cada inmobiliaria tiene una forma propia de presentarse. Construyamos la que necesitás.',
  'quiero-captar-propiedades':
    'Captar propiedades empieza por transmitir confianza y mostrar qué te diferencia.',
  'quiero-conseguir-mas-consultas':
    'Más consultas empiezan cuando tu propuesta llega a las personas correctas y les da motivos para contactarte.',
  'quiero-transmitir-mas-confianza':
    'La confianza se construye en cada detalle de tu marca y de la experiencia.',
  'quiero-llenar-la-agenda':
    'Una agenda más completa empieza por hacer visible tu propuesta y facilitar el próximo paso.',
  'quiero-que-me-encuentren':
    'Para que te encuentren, primero hay que estar donde tus clientes te buscan.',
  'quiero-vender-mas':
    'Vender más empieza por conectar mejor tu propuesta con quienes la necesitan.',
  'quiero-renovar-el-local':
    'Tu local puede contar mejor lo que hace especial a tu negocio.',
  'tengo-un-evento':
    'Cada evento empieza mucho antes del día señalado. ¿Qué necesitás poner en marcha?',
  'quiero-atraer-gente-al-evento-o-stand':
    'Atraer gente es el primer paso; la experiencia es lo que hace que se quede.',
  'quiero-generar-contactos':
    'Los buenos contactos empiezan con una propuesta que invita a acercarse.',
  'quiero-conseguir-alumnos':
    'Conseguir alumnos empieza por mostrar qué hace valiosa tu propuesta.',
  'quiero-mejorar-mi-espacio':
    'Un espacio bien pensado mejora la experiencia desde que alguien entra.',
}

export default function IntentionHero({
  intention,
}: {
  intention: DiscoverySituation
  businessTypeName?: string
}) {
  const headline =
    SITUATION_HEADLINES[intention.slug] ||
    intention.description ||
    'Cada negocio tiene su propio punto de partida. ¿Por dónde necesitás empezar?'

  return (
    <section className="border-b border-gray-200/80 pb-8 sm:pb-10">
      <div className="max-w-4xl">
        <h1 className="text-[clamp(2.15rem,5.1vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.055em] text-gray-950 text-balance">
          {headline}
        </h1>
      </div>
    </section>
  )
}
