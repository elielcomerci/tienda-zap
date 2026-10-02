import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const apply = process.argv.includes('--apply')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, '-').slice(0, 120)
}

function parseMatrix(markdown) {
  const entries = []
  let businessName = null
  let situationName = null
  let needName = null

  for (const line of markdown.split(/\r?\n/)) {
    const businessMatch = line.match(/^#\s+\d+\.\s+(.+)$/)
    if (businessMatch) {
      if (Number(line.match(/^#\s+(\d+)/)?.[1]) >= 8) break
      businessName = businessMatch[1].trim()
      situationName = null
      needName = null
      continue
    }

    const situationMatch = line.match(/^##\s+Situaci[oó]n:\s+(.+)$/i)
    if (situationMatch) {
      situationName = situationMatch[1].trim()
      needName = null
      continue
    }

    const needMatch = line.match(/^###\s+(.+)$/)
    if (needMatch) {
      needName = needMatch[1].trim()
      continue
    }

    const offerMatch = line.match(/^\*\s+(.+)$/)
    if (offerMatch && businessName && situationName && needName) {
      const previous = entries.at(-1)
      if (!previous || previous.businessName !== businessName || previous.situationName !== situationName || previous.needName !== needName) {
        entries.push({ businessName, situationName, needName, offers: [] })
      }
      entries.at(-1).offers.push(offerMatch[1].trim())
    }
  }

  return entries
}

// The matrix uses commercial names. These are the current, concrete offers in
// the inventory that fulfil them. Missing entries deliberately remain missing:
// they are a signal to guide the person to ZAP, not a reason to make up a SKU.
const offerProducts = {
  'Cartelería por m²': ['Cartel rígido para local', 'Cartel Lona Impresión UV', 'Tu cartel visible'],
  'Ploteo de vidriera': ['Vinilo para vidriera'],
  Posters: ['Pósters por medida'],
  Flyers: ['Flyer o volante', 'Folleto'],
  Bolsas: ['Bolsa de papel personalizada', 'Bolsas de friselina personalizadas'],
  Stickers: ['Stickers troquelados'],
  'Sitio web / tienda online': ['Sitio web corporativo', 'Landing page para tu negocio', 'Ecommerce simple'],
  'Chatbot conversacional': ['Asistente comercial para WhatsApp'],
  'Diseño de pieza suelta': ['Pack de piezas para redes'],
  'Posteo para redes': ['Pack de piezas para redes'],
  'Cartel inmobiliario': ['Cartel de venta o alquiler'],
  'Tarjetas personales': ['Tarjetas personales estándar', 'Tarjetas personales premium'],
  'Remeras estampadas DTF': ['Remera personalizada'],
  'Fondo de prensa': ['Backdrop para eventos'],
  'Jingle publicitario': ['Jingle comercial'],
  'Diseño de logo': ['Diseño de logo'],
  Cajas: ['Cajas personalizadas'],
  'Sellos para packaging': ['Sellos para packaging'],
  Reel: ['Reel para redes'],
  'Campaña para redes': ['Campaña para redes'],
  'Video publicitario': ['Video publicitario'],
  'Análisis de datos': ['Análisis de datos'],
  'Edición de video': ['Edición de video'],
  'Música original': ['Música original'],
  Locución: ['Locución publicitaria'],
}

// These offers are deliberately contact-only: they make the capability visible
// in the relevant situation without pretending that it has a fixed SKU or price.
// They can be upgraded to a configurable/direct offer later, without changing
// discovery links already shared with customers.
const contactOnlyOffers = [
  ['Diseño de logo', 'Diseño de logo', 'Una identidad visual original para tu negocio.', 'Construir o actualizar una marca reconocible.'],
  ['Cajas personalizadas', 'Cajas', 'Packaging diseñado y producido según tu producto.', 'Presentar y proteger lo que vendés con una experiencia de marca coherente.'],
  ['Sellos para packaging', 'Sellos para packaging', 'Sellos personalizados para marcar bolsas, cajas y etiquetas.', 'Resolver tiradas flexibles de packaging sin obligarte a una producción cerrada.'],
  ['Reel para redes', 'Reel', 'Una pieza audiovisual breve para redes sociales.', 'Mostrar una propuesta, lanzamiento o promoción de forma ágil.'],
  ['Campaña para redes', 'Campaña para redes', 'Plan, piezas y activación de una campaña digital.', 'Generar demanda con una propuesta y medición acordes a tu caso.'],
  ['Video publicitario', 'Video publicitario', 'Una pieza audiovisual pensada para comunicar y vender.', 'Explicar, lanzar o promocionar con narrativa, imagen y sonido.'],
  ['Análisis de datos', 'Análisis de datos', 'Lectura de información comercial, campañas o comportamiento.', 'Entender qué está funcionando antes de decidir una intervención.'],
  ['Edición de video', 'Edición de video', 'Edición y armado de material audiovisual existente.', 'Convertir material crudo en una pieza lista para publicar.'],
  ['Música original', 'Música original', 'Composición musical original para una pieza audiovisual o publicitaria.', 'Dar identidad sonora a un video, campaña o experiencia.'],
  ['Locución publicitaria', 'Locución', 'Voz profesional para una pieza audiovisual, spot o campaña.', 'Hacer claro y reconocible el mensaje de una comunicación.'],
]

function findBusinessType(businessTypes, matrixName) {
  const target = normalize(matrixName)
  const aliases = {
    'moda showrooms': ['moda', 'showroom'],
    inmobiliarias: ['inmobiliaria'],
    'belleza salud': ['belleza', 'salud'],
    'retail comercios': ['retail', 'comercio'],
    'eventos btl': ['evento', 'btl'],
    'gym yoga': ['gym', 'yoga', 'gimnasio'],
  }
  const terms = aliases[target] || [target]
  return businessTypes.find((businessType) => {
    const candidate = normalize(businessType.name)
    return terms.some((term) => candidate.includes(term) || term.includes(candidate))
  })
}

async function main() {
  const matrix = parseMatrix(await readFile(new URL('../matrizdeproductos.md', import.meta.url), 'utf8'))
  if (matrix.length === 0) throw new Error('No se encontraron situaciones en matrizdeproductos.md')

  const [businessTypes, products, serviceCategory] = await Promise.all([
    prisma.businessType.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.product.findMany({ select: { id: true, name: true, active: true } }),
    prisma.category.findFirst({ where: { isService: true }, select: { id: true, name: true } }),
  ])
  const productByName = new Map(products.map((product) => [normalize(product.name), product]))

  const missingContactOffers = contactOnlyOffers.filter(([name]) => !productByName.has(normalize(name)))
  if (apply && missingContactOffers.length > 0 && !serviceCategory) {
    throw new Error('No hay una categoría de servicios para crear las ofertas de consulta guiada.')
  }

  for (const [name, matrixName, whatIs, purpose] of contactOnlyOffers) {
    let product = productByName.get(normalize(name))
    if (!product && apply && serviceCategory) {
      product = await prisma.product.upsert({
        where: { slug: slugify(name) },
        update: {
          name,
          active: true,
          taxonomy: 'desarrollos',
          conversionType: 'contact',
          whatIs,
          purpose,
          consultationNote: 'Contanos el contexto, el material disponible y el objetivo. ZAP prepara el siguiente paso con vos.',
          configuratorVersion: 'consulta-v1',
          configuratorDefinition: { result: 'GUIDED_REVIEW', blocks: ['brief', 'references'] },
        },
        create: {
          name,
          slug: slugify(name),
          description: whatIs,
          price: 0,
          images: [],
          categoryId: serviceCategory.id,
          stock: 0,
          active: true,
          taxonomy: 'desarrollos',
          conversionType: 'contact',
          whatIs,
          purpose,
          includes: [],
          configurable: [],
          consultationNote: 'Contanos el contexto, el material disponible y el objetivo. ZAP prepara el siguiente paso con vos.',
          configuratorVersion: 'consulta-v1',
          configuratorDefinition: { result: 'GUIDED_REVIEW', blocks: ['brief', 'references'] },
        },
        select: { id: true, name: true, active: true },
      })
    }
    if (product) {
      productByName.set(normalize(name), product)
      productByName.set(normalize(matrixName), product)
    }
  }
  const unresolvedBusinessTypes = new Set()
  const unresolvedOffers = new Set()
  const situationIds = new Map()
  const needIds = new Map()
  const situationBusinessIds = new Map()
  const needBusinessIds = new Map()
  const needProductIds = new Map()

  for (const entry of matrix) {
    const businessType = findBusinessType(businessTypes, entry.businessName)
    if (!businessType) {
      unresolvedBusinessTypes.add(entry.businessName)
      continue
    }

    const situationSlug = slugify(entry.situationName)
    const needSlug = slugify(entry.needName)
    situationBusinessIds.set(situationSlug, new Set([...(situationBusinessIds.get(situationSlug) || []), businessType.id]))
    needBusinessIds.set(needSlug, new Set([...(needBusinessIds.get(needSlug) || []), businessType.id]))

    const productIds = needProductIds.get(needSlug) || new Set()
    for (const offer of entry.offers) {
      const names = offerProducts[offer]
      if (!names) {
        unresolvedOffers.add(offer)
        continue
      }
      const matchingProducts = names.map((name) => productByName.get(normalize(name))).filter(Boolean)
      if (matchingProducts.length === 0) unresolvedOffers.add(offer)
      matchingProducts.filter((product) => product.active).forEach((product) => productIds.add(product.id))
    }
    needProductIds.set(needSlug, productIds)

    if (apply) {
      const situation = await prisma.situation.upsert({
        where: { slug: situationSlug },
        update: { name: entry.situationName, active: true },
        create: { slug: situationSlug, name: entry.situationName, active: true, order: situationIds.size },
        select: { id: true },
      })
      const need = await prisma.need.upsert({
        where: { slug: needSlug },
        update: { name: entry.needName, active: true },
        create: { slug: needSlug, name: entry.needName, active: true, order: needIds.size },
        select: { id: true },
      })
      situationIds.set(situationSlug, situation.id)
      needIds.set(needSlug, need.id)
    }
  }

  if (apply) {
    for (const [situationSlug, situationId] of situationIds) {
      const businessTypeIds = [...(situationBusinessIds.get(situationSlug) || [])]
      const needIdList = [...needIds.entries()]
        .filter(([needSlug]) => matrix.some((entry) => slugify(entry.situationName) === situationSlug && slugify(entry.needName) === needSlug))
        .map(([, needId]) => needId)
      await prisma.situation.update({
        where: { id: situationId },
        data: {
          businessTypes: { set: businessTypeIds.map((id) => ({ id })) },
          needs: { set: needIdList.map((id) => ({ id })) },
        },
      })
    }

    for (const [needSlug, needId] of needIds) {
      await prisma.need.update({
        where: { id: needId },
        data: {
          businessTypes: { set: [...(needBusinessIds.get(needSlug) || [])].map((id) => ({ id })) },
          products: { set: [...(needProductIds.get(needSlug) || [])].map((id) => ({ id })) },
        },
      })
    }
  }

  console.log(`${apply ? 'Sincronizadas' : 'Detectadas'} ${new Set(matrix.map((entry) => entry.situationName)).size} situaciones y ${new Set(matrix.map((entry) => entry.needName)).size} necesidades.`)
  if (unresolvedBusinessTypes.size) console.log(`Rubros sin coincidencia: ${[...unresolvedBusinessTypes].join(', ')}`)
  if (unresolvedOffers.size) console.log(`Ofertas sin producto equivalente (se derivan a consulta): ${[...unresolvedOffers].join(', ')}`)
  if (missingContactOffers.length) console.log(`${apply ? 'Creadas' : 'A crear como consulta guiada'}: ${missingContactOffers.map(([name]) => name).join(', ')}`)
  if (!apply) console.log('Vista previa solamente. Ejecutá con --apply después de aplicar el esquema.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
