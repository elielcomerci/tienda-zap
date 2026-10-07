export type ProductInquiryQuestion = {
  id: string
  label: string
  type: 'single' | 'multiple' | 'text'
  options?: string[]
  allowOther?: boolean
  placeholder?: string
  required?: boolean
}

export type ProductInquiryConfig = {
  intro: string
  questions: ProductInquiryQuestion[]
}

export const PRODUCT_INQUIRY_CONFIGS: Record<string, ProductInquiryConfig> = {
  'cajas-personalizadas': {
    intro: 'Para pasarte un precio necesitamos entender un poco qué necesitás.',
    questions: [
      { id: 'contenido', label: '¿Qué querés poner dentro?', type: 'single', options: ['Producto', 'Comida / gastronomía', 'Regalo', 'Envío'], allowOther: true, required: true },
      { id: 'medida', label: '¿Tenés una medida aproximada?', type: 'single', options: ['Sí, la sé', 'Más o menos', 'No, necesito orientación'], required: true },
      { id: 'cantidad', label: '¿Cuántas necesitás aproximadamente?', type: 'single', options: ['10–50', '50–100', '100–500', '500+', 'Todavía no sé'], required: true },
      { id: 'objetivo', label: '¿Qué necesitás que haga la caja?', type: 'single', options: ['Proteger el producto', 'Presentarlo mejor', 'Enviarlo', 'Las dos cosas'], allowOther: true, required: true },
    ],
  },
  'activos-web-sitios': {
    intro: 'Contanos qué necesitás que haga el sitio y te pasamos una propuesta acorde.',
    questions: [
      { id: 'objetivo', label: '¿Qué necesitás que haga tu sitio?', type: 'multiple', options: ['Mostrar el negocio', 'Recibir consultas', 'Vender', 'Tomar reservas / turnos', 'Mostrar productos'], allowOther: true, required: true },
      { id: 'estado_actual', label: '¿Hoy ya tenés algo funcionando?', type: 'single', options: ['Sí, quiero mejorarlo', 'Sí, pero quedó viejo', 'Tengo algo muy básico', 'No tengo'], allowOther: true, required: true },
      { id: 'funciones', label: '¿Qué debería poder hacer además de mostrar información?', type: 'multiple', options: ['WhatsApp', 'Formularios', 'Reservas / turnos', 'Pagos', 'Catálogo', 'Integraciones', 'No estoy seguro'], allowOther: true, required: true },
      { id: 'conservar', label: '¿Hay algo que quieras conservar o mejorar de lo que ya tenés?', type: 'text', placeholder: 'Si querés, contanos qué te gustaría mantener o cambiar.' },
    ],
  },
  'asistentes-bots': {
    intro: 'Con un poco de contexto podemos entender qué debería hacer el asistente y cotizarlo mejor.',
    questions: [
      { id: 'canal', label: '¿Dónde querés que funcione?', type: 'multiple', options: ['WhatsApp', 'Web'], allowOther: true, required: true },
      { id: 'objetivo', label: '¿Qué debería hacer principalmente?', type: 'multiple', options: ['Responder consultas', 'Calificar interesados', 'Tomar pedidos', 'Dar turnos / reservas', 'Derivar al equipo'], allowOther: true, required: true },
      { id: 'hoy', label: '¿Qué pasa hoy cuando alguien te escribe?', type: 'single', options: ['Respondemos manualmente', 'Tenemos respuestas automáticas', 'Alguien del equipo se ocupa', 'Depende del momento', 'No tenemos un proceso definido'], allowOther: true, required: true },
      { id: 'contexto', label: '¿Hay algo más que debamos saber?', type: 'text', placeholder: 'Contanos lo que creas importante. No hace falta que esté perfecto.' },
    ],
  },
  'anuncios-campanas': {
    intro: 'Necesitamos entender qué querés mover con la campaña para poder decirte cuánto implica.',
    questions: [
      { id: 'objetivo', label: '¿Qué querés conseguir con la campaña?', type: 'single', options: ['Más consultas', 'Más ventas / pedidos', 'Más visitas', 'Lanzar algo', 'Promocionar una apertura'], allowOther: true, required: true },
      { id: 'promocionar', label: '¿Qué querés promocionar?', type: 'text', placeholder: 'Producto, servicio, apertura, evento, promoción…', required: true },
      { id: 'canales', label: '¿Dónde querés hacer la campaña?', type: 'multiple', options: ['Instagram / Facebook', 'Google'], allowOther: true, required: true },
      { id: 'estado', label: '¿Ya tenés algo funcionando?', type: 'single', options: ['Sí, queremos mejorarlo', 'Sí, pero no está funcionando como esperamos', 'No', 'Estamos por empezar'], allowOther: true, required: true },
    ],
  },
  'produccion-audiovisual': {
    intro: 'Con estas respuestas podemos entender qué hay que producir y qué tan cerca está la fecha.',
    questions: [
      { id: 'produccion', label: '¿Qué necesitás producir?', type: 'multiple', options: ['Reels / contenido para redes', 'Video comercial', 'Fotos de producto', 'Cobertura de evento'], allowOther: true, required: true },
      { id: 'uso', label: '¿Dónde lo vas a usar?', type: 'multiple', options: ['Redes', 'Web', 'Publicidad', 'Evento'], allowOther: true, required: true },
      { id: 'idea', label: '¿Ya tenés definido qué querés mostrar?', type: 'single', options: ['Sí, tenemos una idea', 'Tenemos una idea pero necesitamos desarrollarla', 'No, necesitamos pensarlo'], allowOther: true, required: true },
      { id: 'fecha', label: '¿Cuándo lo necesitás?', type: 'single', options: ['Esta semana', 'Este mes', 'Más adelante', 'Todavía no tengo fecha'], allowOther: true, required: true },
    ],
  },
  'sistema-identidad': {
    intro: 'Queremos entender en qué momento está tu marca para dimensionar bien el trabajo.',
    questions: [
      { id: 'momento', label: '¿Qué necesitás hacer con tu marca?', type: 'single', options: ['Crear una marca desde cero', 'Renovar la que tengo', 'Ordenar una marca que creció', 'Prepararla para crecer'], allowOther: true, required: true },
      { id: 'hoy', label: '¿Qué tenés hoy?', type: 'multiple', options: ['Logo', 'Colores / tipografías', 'Manual de marca', 'Algunas aplicaciones', 'Prácticamente nada', 'Todo mezclado'], allowOther: true, required: true },
      { id: 'donde', label: '¿Dónde necesitás que la identidad funcione?', type: 'multiple', options: ['Redes', 'Local / espacio físico', 'Packaging', 'Web', 'Papelería', 'Todo'], allowOther: true, required: true },
      { id: 'conservar', label: '¿Hay algo de tu marca actual que quieras conservar sí o sí?', type: 'text', placeholder: 'Si hay algo que no querés perder, contanos.' },
    ],
  },
  'operaciones-consultoria': {
    intro: 'Necesitamos ubicar dónde está el problema y qué está generando hoy.',
    questions: [
      { id: 'problema', label: '¿Dónde sentís que más se complica hoy el negocio?', type: 'multiple', options: ['Ventas', 'Atención / seguimiento', 'Organización interna', 'Procesos', 'Equipo', 'Información / herramientas', 'No sé exactamente'], allowOther: true, required: true },
      { id: 'impacto', label: '¿Qué pasa cuando eso ocurre?', type: 'multiple', options: ['Perdemos tiempo', 'Perdemos ventas', 'Se hacen cosas de más', 'Dependemos demasiado de una persona', 'Hay errores', 'Todo cuesta más de lo que debería'], allowOther: true, required: true },
      { id: 'cambio', label: '¿Qué te gustaría que funcione distinto?', type: 'text', placeholder: 'Contanos qué te gustaría cambiar o destrabar.', required: true },
    ],
  },
  'sistema-captacion-eventos': {
    intro: 'Con este contexto podemos entender qué debería pasar con cada contacto que genera el evento.',
    questions: [
      { id: 'evento', label: '¿Qué tipo de evento estás preparando?', type: 'single', options: ['Feria / exposición', 'Stand', 'Activación', 'Evento propio', 'Congreso / encuentro'], allowOther: true, required: true },
      { id: 'contacto', label: '¿Qué contacto querés conseguir?', type: 'multiple', options: ['WhatsApp', 'Datos de contacto', 'Consultas comerciales', 'Turnos / reservas', 'Seguimiento posterior'], allowOther: true, required: true },
      { id: 'hoy', label: '¿Qué pasa hoy con la gente que se acerca?', type: 'single', options: ['Nos deja datos', 'Nos escribe por WhatsApp', 'Interactúa pero después se pierde', 'Tomamos contactos manualmente', 'Todavía no tenemos un mecanismo'], allowOther: true, required: true },
      { id: 'fecha', label: '¿Cuándo es el evento?', type: 'single', options: ['Tengo una fecha concreta', 'Este mes', 'Más adelante', 'Todavía no está definido'], allowOther: true, required: true },
    ],
  },
}
