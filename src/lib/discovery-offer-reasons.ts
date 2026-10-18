type DiscoveryOfferReasonKey = {
  businessTypeSlug?: string
  situationSlug?: string
  needSlug: string
  productSlug: string
}

const REASONS: Record<string, string> = {
  "gastronomia|estoy-por-abrir|necesito-que-el-local-se-vea-terminado-y-reconocible|sistema-identidad":
    "Define cómo debería verse el negocio para que todo lo que hagamos después tenga una misma lógica.",
  "gastronomia|estoy-por-abrir|necesito-que-el-local-se-vea-terminado-y-reconocible|carteleria-ploteo":
    "Hace visible el negocio y lleva esa identidad al espacio donde la gente lo va a encontrar.",
  "gastronomia|estoy-por-abrir|necesito-que-el-local-se-vea-terminado-y-reconocible|corporeos-marquesinas":
    "Ayuda a que el local se reconozca desde afuera y tenga presencia propia.",
  "gastronomia|estoy-por-abrir|necesito-que-el-local-se-vea-terminado-y-reconocible|senaletica-placas":
    "Ordena recorridos, accesos e información para que el espacio se entienda desde el primer día.",
  "gastronomia|estoy-por-abrir|necesito-preparar-el-packaging|cajas-personalizadas":
    "Llevan la identidad del negocio al momento en que el pedido sale del local.",
  "gastronomia|estoy-por-abrir|necesito-preparar-el-packaging|bolsas-contenedores":
    "Resuelven la entrega sin perder coherencia con la marca.",
  "gastronomia|estoy-por-abrir|necesito-preparar-el-packaging|adhesivos-stickers":
    "Permiten identificar, cerrar o comunicar el pedido sin sumar una pieza compleja.",
  "gastronomia|estoy-por-abrir|necesito-preparar-el-packaging|fajas-envoltorios":
    "Ayudan a presentar y cerrar el packaging con una pieza simple y reconocible.",
  "gastronomia|estoy-por-abrir|necesito-comunicar-la-apertura|flyers-desplegables":
    "Llevan la apertura a la calle y dejan información que la gente puede conservar.",
  "gastronomia|estoy-por-abrir|necesito-comunicar-la-apertura|carteleria-ploteo":
    "Hace que la apertura también se comunique desde el propio local.",
  "gastronomia|estoy-por-abrir|necesito-comunicar-la-apertura|produccion-audiovisual":
    "Convierte la apertura en contenido que se puede mostrar antes y después de abrir.",
  "gastronomia|estoy-por-abrir|necesito-comunicar-la-apertura|anuncios-campanas":
    "Pone la apertura frente a personas que todavía no conocen el negocio.",
  "gastronomia|quiero-conseguir-mas-pedidos|necesito-comunicar-mejor-lo-que-vendo|flyers-desplegables":
    "Llevan la propuesta a la mano de alguien que ya puede estar listo para pedir.",
  "gastronomia|quiero-conseguir-mas-pedidos|necesito-comunicar-mejor-lo-que-vendo|produccion-audiovisual":
    "Hace que la propuesta se entienda y resulte más deseable antes de pedir.",
  "gastronomia|quiero-conseguir-mas-pedidos|necesito-comunicar-mejor-lo-que-vendo|anuncios-campanas":
    "Lleva esa propuesta a más personas, más allá de quienes ya conocen el negocio.",
  "gastronomia|quiero-conseguir-mas-pedidos|necesito-facilitar-el-contacto|sitios-web-catalogos-digitales":
    "Ordena el recorrido para que pedirte sea fácil cuando alguien ya decidió hacerlo.",
  "gastronomia|quiero-conseguir-mas-pedidos|necesito-facilitar-el-contacto|asistentes-bots":
    "Ayuda a responder y derivar consultas cuando hacerlo manualmente empieza a generar fricción.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-mejorar-como-se-presenta-el-espacio|carteleria-ploteo":
    "Hace que el espacio comunique mejor qué marca y qué propuesta hay detrás.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-mejorar-como-se-presenta-el-espacio|corporeos-marquesinas":
    "Le da presencia a la marca dentro o fuera del espacio comercial.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-mejorar-como-se-presenta-el-espacio|senaletica-placas":
    "Ordena la experiencia para que el espacio sea más fácil de recorrer y entender.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-mejorar-como-se-presenta-el-espacio|adhesivos-stickers":
    "Permiten intervenir superficies y puntos concretos sin rehacer todo el espacio.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-comunicar-productos-o-promociones|flyers-desplegables":
    "Pone productos o promociones en un soporte que el cliente puede llevarse.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-comunicar-productos-o-promociones|carteleria-ploteo":
    "Hace visible la propuesta en el lugar exacto donde la decisión de compra sucede.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-comunicar-productos-o-promociones|produccion-audiovisual":
    "Permite mostrar producto y propuesta con más impacto en pantallas, redes u otros puntos de contacto.",
  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-comunicar-productos-o-promociones|anuncios-campanas":
    "Amplifica productos o promociones para que no dependan solamente del tránsito del local.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-mostrar-mejor-las-propiedades|produccion-audiovisual":
    "Hace que cada propiedad se entienda y se perciba mejor antes de que alguien consulte.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-mostrar-mejor-las-propiedades|anuncios-campanas":
    "Pone las propiedades frente a personas que todavía no las están buscando en tu canal.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-mostrar-mejor-las-propiedades|sitios-web-catalogos-digitales":
    "Ordena la información para que una propiedad pueda ser explorada y consultada con menos fricción.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-facilitar-el-contacto|sitios-web-catalogos-digitales":
    "Hace más claro y directo el camino desde una propiedad hasta una consulta.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-facilitar-el-contacto|asistentes-bots":
    "Ayuda a atender y derivar consultas cuando el volumen o los horarios empiezan a ser un problema.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-comunicar-servicios|flyers-desplegables":
    "Permiten presentar servicios de forma clara en el espacio donde ya están tus clientes.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-comunicar-servicios|carteleria-ploteo":
    "Hace visibles servicios y propuestas en el propio espacio.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-comunicar-servicios|produccion-audiovisual":
    "Muestra cómo es el servicio y ayuda a que alguien entienda qué está por elegir.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-comunicar-servicios|anuncios-campanas":
    "Lleva esos servicios a personas que todavía no conocen el espacio.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-facilitar-el-contacto|sitios-web-catalogos-digitales":
    "Ordena la información y el camino para que reservar o consultar sea sencillo.",
  "belleza-salud|quiero-llenar-la-agenda|necesito-facilitar-el-contacto|asistentes-bots":
    "Reduce la fricción de responder consultas y derivarlas hacia una reserva.",
  "comercios-retail|quiero-que-me-encuentren|necesito-llamar-la-atencion-desde-la-calle|carteleria-ploteo":
    "Hace visible el negocio desde el lugar donde una persona decide si entrar o seguir de largo.",
  "comercios-retail|quiero-que-me-encuentren|necesito-llamar-la-atencion-desde-la-calle|corporeos-marquesinas":
    "Construye una presencia reconocible para que el local se destaque en su entorno.",
  "comercios-retail|quiero-que-me-encuentren|necesito-llamar-la-atencion-desde-la-calle|senaletica-placas":
    "Ayuda a que el acceso y la información del local se entiendan rápidamente.",
  "comercios-retail|quiero-que-me-encuentren|necesito-llamar-la-atencion-desde-la-calle|adhesivos-stickers":
    "Permiten sumar mensajes o identidad en puntos visibles del local.",
  "comercios-retail|quiero-que-me-encuentren|necesito-comunicar-promociones|flyers-desplegables":
    "Lleva la promoción a la mano de quien ya está cerca del negocio.",
  "comercios-retail|quiero-que-me-encuentren|necesito-comunicar-promociones|carteleria-ploteo":
    "Hace visible la promoción en el lugar donde la gente puede decidir entrar.",
  "comercios-retail|quiero-que-me-encuentren|necesito-comunicar-promociones|produccion-audiovisual":
    "Permite comunicar promociones con contenido que se destaca más allá de una pieza estática.",
  "comercios-retail|quiero-que-me-encuentren|necesito-comunicar-promociones|anuncios-campanas":
    "Amplifica la promoción para que no dependa solamente del tránsito frente al local.",
  "eventos-experiencias|quiero-generar-contactos|necesito-convertir-las-interacciones-en-contactos|sistema-captacion-eventos":
    "Diseña el mecanismo para que una interacción durante el evento pueda convertirse en un contacto útil después.",
  "wellness|quiero-conseguir-alumnos|necesito-que-una-propuesta-se-vea|flyers-desplegables":
    "Ayudan a presentar la propuesta de forma clara y tangible en los puntos donde puede aparecer un nuevo alumno.",
  "wellness|quiero-conseguir-alumnos|necesito-que-una-propuesta-se-vea|carteleria-ploteo":
    "Hace visible la propuesta en el espacio y ayuda a que se entienda qué ofrecés.",
  "wellness|quiero-conseguir-alumnos|necesito-que-una-propuesta-se-vea|produccion-audiovisual":
    "Muestra la experiencia y ayuda a que alguien imagine cómo sería entrenar o participar.",
  "wellness|quiero-conseguir-alumnos|necesito-que-una-propuesta-se-vea|anuncios-campanas":
    "Lleva la propuesta a personas que todavía no conocen el espacio.",
  "wellness|quiero-conseguir-alumnos|necesito-facilitar-el-contacto|sitios-web-catalogos-digitales":
    "Ordena la información y el camino para que consultar o inscribirse sea sencillo.",
  "wellness|quiero-conseguir-alumnos|necesito-facilitar-el-contacto|asistentes-bots":
    "Ayuda a atender consultas y derivarlas cuando responder manualmente empieza a quitar tiempo.",
  "gastronomia|quiero-que-mis-clientes-vuelvan|necesito-mantener-la-marca-presente|anuncios-campanas":
    "Diseñamos una campaña a medida para dar un motivo concreto para volver a pedir, según tus clientes, tus márgenes y la forma en que vendés.",
  "gastronomia|quiero-que-mis-clientes-vuelvan|necesito-mantener-la-marca-presente|sitios-web-catalogos-digitales":
    "Un menú digital o una presencia propia puede facilitar el próximo pedido y ayudar a que el cliente vuelva a elegirte.",
  "belleza-salud|quiero-que-mis-clientes-vuelvan|necesito-mantener-la-marca-presente|anuncios-campanas":
    "Una campaña pensada para tu actividad puede dar un motivo para volver, retomar un servicio o conocer una propuesta nueva.",
  "belleza-salud|quiero-que-mis-clientes-vuelvan|necesito-comunicar-novedades|anuncios-campanas":
    "Organiza las novedades como una acción concreta para volver a conectar con quienes ya te conocen.",
  "wellness|quiero-que-mis-clientes-vuelvan|necesito-mantener-contacto-con-alumnos|anuncios-campanas":
    "Una campaña a medida puede ayudar a recuperar alumnos inactivos, sostener la continuidad o comunicar nuevas propuestas.",
  "gastronomia|quiero-que-mis-clientes-vuelvan|necesito-mantener-la-marca-presente|objetos-regaleria":
    "Un regalo útil con tu marca mantiene el vínculo después de la compra y ayuda a que te recuerden.",

  "moda-showrooms|quiero-vender-mas-en-el-local|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Diseñamos una campaña para que quienes ya compraron tengan un motivo para volver, alineada con tus colecciones y tu forma de vender.",
  "moda-showrooms|quiero-vender-online|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Una campaña puede ayudar a reactivar compradores y acompañar nuevos lanzamientos; definimos el mecanismo según tus canales y datos disponibles.",
  "comercios-retail|quiero-vender-mas|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Pensamos una acción de recompra según tu tipo de comercio, frecuencia de compra y margen, en lugar de aplicar una promoción genérica.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-dar-seguimiento-a-los-contactos|automatizaciones-comerciales":
    "Ayuda a ordenar el seguimiento de consultas y próximos pasos; las integraciones se definen según las herramientas que ya use la inmobiliaria.",
  "inmobiliarias|quiero-conseguir-mas-consultas|necesito-dar-seguimiento-a-los-contactos|asistentes-bots":
    "Puede facilitar respuestas y derivaciones iniciales, con alcance e integraciones definidos antes de implementarlo.",
  "eventos-experiencias|quiero-generar-contactos|necesito-dar-seguimiento-a-los-contactos|sistema-captacion-eventos":
    "Conecta la captación durante el evento con una base de contactos que pueda trabajarse después.",
  "eventos-experiencias|quiero-generar-contactos|necesito-dar-seguimiento-a-los-contactos|automatizaciones-comerciales":
    "Permite evaluar recordatorios y seguimientos posteriores al evento según los datos capturados y las herramientas disponibles.",
  "gastronomia|quiero-que-mis-clientes-vuelvan|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Diseñamos una campaña para incentivar el próximo pedido con una propuesta coherente con el margen, la frecuencia de compra y el canal propio del negocio.",
  "belleza-salud|quiero-que-mis-clientes-vuelvan|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Una campaña a medida puede invitar a retomar un servicio o volver a reservar, según el vínculo y la frecuencia de cada cliente.",
  "wellness|quiero-que-mis-clientes-vuelvan|necesito-recuperar-clientes-y-generar-recompra|anuncios-campanas":
    "Una campaña a medida puede ayudar a recuperar alumnos inactivos y sostener la continuidad, sin asumir una plataforma de membresías o reservas.",
}

export function getDiscoveryOfferReason({
  businessTypeSlug,
  situationSlug,
  needSlug,
  productSlug,
}: DiscoveryOfferReasonKey) {
  return REASONS[
    [businessTypeSlug || '', situationSlug || '', needSlug, productSlug].join('|')
  ] || null
}
