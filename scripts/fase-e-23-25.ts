/**
 * FASE E — Ítems 23, 24, 25
 * 23: Nombres inconsistentes → homogeneizar
 * 24: Copy de packs (situación→piezas) en los 6 restantes
 * 25: Fichas con tono roto evidentes (las que quedaron fuera de Fase C)
 */

import { Pool } from 'pg'

const pool = new Pool({
  connectionString:
    'postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
})

type Update = {
  slug: string
  name?: string
  description?: string
}

// ─────────────────────────────────────────────────────────────
// 23. NOMBRES INCONSISTENTES
// Criterio: tildes faltantes, slashes, mezcla idiomática, tecnicismos
// No se toca lo que ya funciona bien
// ─────────────────────────────────────────────────────────────
const NOMBRES: Update[] = [
  // Tildes faltantes en nombres de packs
  {
    slug: 'pack-gastronomia-local-activo',
    name: 'Pack Gastronomía · Local Activo',
  },
  {
    slug: 'pack-inmobiliaria-captacion-total',
    name: 'Pack Inmobiliaria · Captación Total',
  },
  {
    slug: 'pack-gym-inscripciones',
    name: 'Pack Gym · Más Inscripciones',
  },
  {
    slug: 'pack-belleza-agenda-llena',
    name: 'Pack Belleza · Agenda Llena',
  },
  {
    slug: 'pack-moda-packaging-y-venta-online',
    name: 'Pack Moda · Packaging y Venta Online',
  },
  {
    slug: 'pack-retail-vidriera-y-whatsapp',
    name: 'Pack Retail · Vidriera y WhatsApp',
  },
  {
    slug: 'pack-eventos-presencia-completa',
    name: 'Pack Eventos · Presencia Completa',
  },
  // Slashes en nombres → guion
  {
    slug: 'flyer-volante-simple',
    name: 'Flyer o volante',
  },
  {
    slug: 'cartel-venta-alquiler',
    name: 'Cartel de venta o alquiler',
  },
  // Mezcla idiomática
  {
    slug: 'voucher-gift-card',
    name: 'Voucher o gift card',  // Este está bien, es un producto reconocible en ambos idiomas → mantener
  },
  // Tecnicismo excesivo
  {
    slug: 'diseno-y-desarrollo-de-landing-page-optimizada',
    name: 'Landing page para tu negocio',
  },
  {
    slug: 'landing-de-captacion-inmobiliaria',
    name: 'Landing de captación inmobiliaria',
  },
  {
    slug: 'block-anotador-personalizado',
    name: 'Block o anotador personalizado',
  },
]

// ─────────────────────────────────────────────────────────────
// 24. COPY DE PACKS — patrón: situación → qué resuelve → piezas
// El pack Eventos ya estaba bien según el checklist.
// Corrijo los 6 restantes + Pack de piezas para redes.
// ─────────────────────────────────────────────────────────────
const PACKS: Update[] = [
  {
    slug: 'pack-belleza-agenda-llena',
    description:
      'Todo lo que necesitás para que un turno no sea el primero y el último. Activá reservas, fidelizá clientes y sostené la recompra con una presencia de marca que transmite profesionalismo desde el primer contacto.\n\nIncluye tarjetas de turnos, vouchers, stickers, optimización en Google Business y piezas para redes sociales.',
  },
  {
    slug: 'pack-gastronomia-local-activo',
    description:
      'Para el local que necesita vender más: desde la mesa, desde el delivery y desde la vidriera. Todo coordinado para que cada punto de contacto empuje al siguiente.\n\nIncluye menú QR, presencia en Google Business, stickers, imanes y vinilo para vidriera.',
  },
  {
    slug: 'pack-gym-inscripciones',
    description:
      'Para convertir consultas en inscripciones y mantener el ritmo de captación todo el año. Combinamos presencia digital con materiales físicos para que el gimnasio se vea profesional y atraiga nuevos socios.\n\nIncluye landing de captación, Google Business, flyers, vinilo de vidriera y piezas para redes sociales.',
  },
  {
    slug: 'pack-inmobiliaria-captacion-total',
    description:
      'Para que cada propiedad que captás ya tenga presencia de marca desde el cartel hasta la reunión. Todo lo que necesita una inmobiliaria para generar confianza y captar consultas con imagen consistente.\n\nIncluye carteles, tarjetas personales, carpeta corporativa, landing y Google Business.',
  },
  {
    slug: 'pack-moda-packaging-y-venta-online',
    description:
      'Para que la experiencia de compra arranque desde el empaque y continúe online. Presentación de marca coherente que acompaña al producto desde que se fabrica hasta que llega al cliente.\n\nIncluye bolsas personalizadas, etiquetas colgantes, stickers, tarjetas y ecommerce simple.',
  },
  {
    slug: 'pack-retail-vidriera-y-whatsapp',
    description:
      'Para transformar el tráfico de calle en consultas y ventas. Captamos la atención desde afuera del local y mantenemos la conversación abierta por WhatsApp.\n\nIncluye vinilo de vidriera, flyers, exhibidores, Google Business y WhatsApp comercial configurado.',
  },
  {
    slug: 'pack-de-piezas-para-redes',
    description:
      'Para tener contenido visual listo para publicar, sin depender de diseño en el momento. Piezas base pensadas para tu comunicación cotidiana y promociones.\n\nIncluye diseños para feed de Instagram, historias y piezas de comunicación comercial adaptadas a tu marca.',
  },
]

// ─────────────────────────────────────────────────────────────
// 25. FICHAS DESALINEADAS — tono roto o contradicciones evidentes
// Solo las que quedaron fuera de Fase C
// ─────────────────────────────────────────────────────────────
const FICHAS: Update[] = [
  {
    slug: 'desarrollo-sitio-web-corporativo-institucional',
    name: 'Sitio web corporativo',
    description:
      'Para el negocio que necesita tener presencia digital seria, con un sitio que refleje lo que hace y genere confianza desde el primer clic.\n\nDesarrollado en tecnología moderna, adaptado a tu marca e información, preparado para funcionar en todos los dispositivos y crecer con tu empresa.',
  },
  {
    slug: 'jingle-comercial-publicitario',
    name: 'Jingle comercial',
    description:
      'Para que tu marca tenga una voz que se recuerde. Un jingle pensado para tu negocio, producido para radio, redes o punto de venta.\n\nNos ocupamos de la música, la letra y la producción final. Vos nos contás qué querés comunicar.',
  },
  {
    slug: 'whatsapp-comercial-configurado',
    description:
      'Para que tu WhatsApp de trabajo funcione como un canal de ventas real. Configuración de WhatsApp Business con respuestas rápidas, catálogo, horarios y todo lo que hace que el primer contacto sea profesional.\n\nEntregamos el canal configurado y te explicamos cómo usarlo.',
  },
  {
    slug: 'menu-qr-para-restaurantes',
    description:
      'Para dejar de imprimir menús cada vez que cambia el precio. Un menú digital que se actualiza desde tu celular, se accede con QR y se ve bien en cualquier pantalla.\n\nIncluye diseño, configuración, QR imprimible y acceso para editar tu menú cuando necesites.',
  },
  {
    slug: 'ploteo-vehicular',
    description:
      'Para que tu vehículo trabaje como cartelería en movimiento. Aplicación de vinilo con tu marca, datos de contacto y diseño pensado para identificar la unidad a distancia.\n\nTrabajamos sobre autos, camionetas, furgones y flotas. Cotizamos según superficie y tipo de aplicación.',
  },
  {
    slug: 'exhibidor',
    description:
      'Para mostrar productos en el punto de venta de forma ordenada y con presencia de marca. Exhibidores de mostrador o piso, con diseño adaptado a tu producto y tu espacio.',
  },
  {
    slug: 'display-caballete',
    description:
      'Para comunicar en el punto de entrada sin ocupar paredes ni mostrador. Un caballete con tu mensaje, pensado para el interior o la vereda del local.',
  },
  {
    slug: 'senaletica-interior',
    description:
      'Para que cada parte del local comunique algo. Señalética de interior para orientar, informar o reforzar la identidad de marca en pasillos, sectores y cajas.',
  },
  {
    slug: 'backdrop-para-eventos',
    description:
      'Para que tu evento tenga presencia de marca desde la foto hasta el video. Backdrop impreso con tu diseño, listo para instalar y fotografiar.',
  },
  {
    slug: 'credenciales-para-eventos',
    description:
      'Para que el personal, los expositores o los asistentes se identifiquen con una credencial que está a la altura del evento. Diseño, impresión y terminación incluidos.',
  },
  {
    slug: 'gigantografias',
    description:
      'Para impactar en grande. Impresión de gran formato para eventos, locales, obras, puntos de venta o cualquier espacio donde necesitás que tu mensaje no pase desapercibido.',
  },
]

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let totalOk = 0

    // 23 — nombres
    for (const p of NOMBRES) {
      if (!p.name) continue
      const res = await client.query(
        `UPDATE "Product" SET name = $1 WHERE slug = $2 RETURNING name`,
        [p.name, p.slug]
      )
      if (res.rowCount && res.rowCount > 0) {
        console.log(`  [nombre] ${p.slug} → "${res.rows[0].name}"`)
        totalOk++
      } else {
        console.warn(`  WARN nombre no encontrado: ${p.slug}`)
      }
    }

    // 24 — packs
    for (const p of PACKS) {
      const res = await client.query(
        `UPDATE "Product" SET description = $1 WHERE slug = $2 RETURNING name`,
        [p.description, p.slug]
      )
      if (res.rowCount && res.rowCount > 0) {
        console.log(`  [pack]   ${p.slug} ✓`)
        totalOk++
      } else {
        console.warn(`  WARN pack no encontrado: ${p.slug}`)
      }
    }

    // 25 — fichas
    for (const p of FICHAS) {
      const sets: string[] = []
      const values: string[] = []
      let i = 1
      if (p.name) { sets.push(`name = $${i++}`); values.push(p.name) }
      if (p.description) { sets.push(`description = $${i++}`); values.push(p.description) }
      if (sets.length === 0) continue
      values.push(p.slug)
      const res = await client.query(
        `UPDATE "Product" SET ${sets.join(', ')} WHERE slug = $${i} RETURNING name`,
        values
      )
      if (res.rowCount && res.rowCount > 0) {
        console.log(`  [ficha]  ${p.slug} ✓`)
        totalOk++
      } else {
        console.warn(`  WARN ficha no encontrada: ${p.slug}`)
      }
    }

    await client.query('COMMIT')
    console.log(`\nOK ${totalOk} actualizaciones aplicadas.\n`)

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('ROLLBACK:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
