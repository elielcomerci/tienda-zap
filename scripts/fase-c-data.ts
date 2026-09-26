/**
 * Fase C — Script de datos
 * Ejecutar: npx tsx scripts/fase-c-data.ts
 *
 * Qué hace:
 *   1. Setea conversionType + copy en los 5 productos críticos
 *   2. Corrige encoding roto (UTF-8 mal decodificado como Latin-1) en todo el catálogo
 *   3. Corrige ortografía visible en todo el catálogo
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

// ── 1. Correcciones de encoding Latin-1 → UTF-8 ───────────────────────────
// Detecta y reemplaza las secuencias más comunes de mojibake en español
function fixEncoding(text: string | null): string | null {
  if (!text) return text
  return text
    // vocales con tilde (minúsculas)
    .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í').replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú')
    // vocales con tilde (mayúsculas)
    .replace(/Ã\x81/g, 'Á').replace(/Ã\x89/g, 'É').replace(/Ã\x8d/g, 'Í').replace(/Ã\x93/g, 'Ó').replace(/Ã\x9a/g, 'Ú')
    // ñ/Ñ
    .replace(/Ã±/g, 'ñ').replace(/Ã\x91/g, 'Ñ')
    // ü/Ü
    .replace(/Ã¼/g, 'ü').replace(/Ã\x9c/g, 'Ü')
    // ¿ ¡
    .replace(/Â¿/g, '¿').replace(/Â¡/g, '¡')
    // « »
    .replace(/Â«/g, '«').replace(/Â»/g, '»')
    // otros frecuentes en copies de agencias argentinas
    .replace(/â€œ/g, '"').replace(/â€/g, '"').replace(/â€™/g, "'").replace(/â€"/g, '–').replace(/â€"/g, '—')
    // Casos que aparecen como ElegÃ → Elegí
    .replace(/ElegÃ\b/g, 'Elegí')
}

// ── 2. Ortografía visible ─────────────────────────────────────────────────
// Reemplazos de texto exacto, case-sensitive para evitar colisiones
const ORTHO_REPLACEMENTS: [RegExp, string][] = [
  [/\bCheff\b/g, 'Chef'],
  [/\bcheff\b/g, 'chef'],
  [/\bsublimacion\b/gi, 'sublimación'],
  [/\btamano\b/g, 'tamaño'],
  [/\bfidelizacion\b/gi, 'fidelización'],
  [/\bDiseno\b/g, 'Diseño'],
  [/\bdiseno\b/g, 'diseño'],
  [/\bincluído\b/gi, 'incluido'],
  [/\bgoogle\b/g, 'Google'],
  [/\bMenu gastronomico\b/gi, 'Menú gastronómico'],
  [/\bImpresion\b/g, 'Impresión'],
  [/\bimpresion\b/g, 'impresión'],
  [/\bcomunicacion\b/gi, 'comunicación'],
]

function fixOrtho(text: string | null): string | null {
  if (!text) return text
  let result = text
  for (const [pattern, replacement] of ORTHO_REPLACEMENTS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function sanitize(text: string | null): string | null {
  return fixOrtho(fixEncoding(text))
}

// ── 3. Fichas críticas ────────────────────────────────────────────────────
const CRITICAL_PRODUCTS: {
  slug: string
  name?: string
  description: string
  conversionType?: string | null
}[] = [
  {
    slug: 'asistente-comercial-con-ia-para-whatsapp-2',
    name: 'Asistente comercial para WhatsApp',
    description:
      'Un asistente pensado para tu negocio, entrenado con tu información y preparado para atender consultas, calificar oportunidades y derivar cuando hace falta.',
    conversionType: 'contact',
  },
  {
    slug: 'ecommerce-simple',
    description:
      'Una tienda online para mostrar lo que vendés, recibir pedidos y ordenar el proceso de venta. Desarrollada en Next.js, adaptada a tu negocio y preparada para crecer.',
    conversionType: null,
  },
  {
    slug: 'optimizacion-para-buscadores-seo',
    description:
      'Que te encuentren. Trabajamos la estructura, el contenido y los aspectos técnicos que ayudan a que tu negocio aparezca cuando alguien busca lo que ofrecés.',
    conversionType: null,
  },
  {
    slug: 'google-business',
    description:
      'Que te encuentren cuando te están buscando. Ponemos tu negocio en Google, ordenamos la información importante y dejamos tu perfil preparado para convertir búsquedas en visitas y consultas.',
    conversionType: null,
  },
  {
    slug: 'cartel-lona-impresion-uv',
    description:
      'Un cartel que resiste a la intemperie, no pierde el color y se ve bien desde lejos. Material flexible de alta densidad con impresión UV directa. Configurá medidas, terminaciones y cantidad.',
    conversionType: 'configure',
  },
  {
    slug: 'tarjetas-personales-premium',
    description:
      'Tarjetas de presentación en papel de alta gramaje con terminaciones que dicen algo antes de que hables. Configurá el papel, el acabado y la cantidad.',
    conversionType: 'configure',
  },
]

// Slugs de búsqueda alternativos por si el slug exacto no coincide
const SLUG_ALIASES: Record<string, string[]> = {
  'optimizacion-para-buscadores-seo': ['seo', 'optimizacion-seo', 'optimizacion-buscadores'],
  'cartel-lona-impresion-uv': ['cartel-lona', 'lona-impresion-uv', 'cartel-lona-uv'],
  'tarjetas-personales-premium': ['tarjetas-premium', 'tarjetas-personales'],
}

async function findProduct(slug: string) {
  const direct = await prisma.product.findUnique({ where: { slug } })
  if (direct) return direct

  const aliases = SLUG_ALIASES[slug] || []
  for (const alias of aliases) {
    const found = await prisma.product.findUnique({ where: { slug: alias } })
    if (found) return found
  }

  // Fuzzy fallback: buscar por slug que contenga la primera parte del slug
  const prefix = slug.split('-').slice(0, 3).join('-')
  const fuzzy = await prisma.product.findFirst({
    where: { slug: { contains: prefix } },
  })
  return fuzzy
}

async function main() {
  console.log('\n══ Fase C — Script de datos ══\n')

  // ── A. Fichas críticas ──────────────────────────────────────────────────
  console.log('▶ Actualizando fichas críticas...')
  for (const cp of CRITICAL_PRODUCTS) {
    const product = await findProduct(cp.slug)
    if (!product) {
      console.warn(`  ⚠ No encontrado: ${cp.slug}`)
      continue
    }
    const updateData: Record<string, any> = {
      description: cp.description,
      conversionType: cp.conversionType ?? null,
    }
    if (cp.name) updateData.name = cp.name

    await prisma.product.update({
      where: { id: product.id },
      data: updateData,
    })
    console.log(`  ✓ ${product.slug} → conversionType=${cp.conversionType ?? 'null'}`)
  }

  // ── B. Encoding + Ortografía en todo el catálogo ──────────────────────
  console.log('\n▶ Corrigiendo encoding y ortografía en catálogo completo...')
  const allProducts = await prisma.product.findMany({
    select: { id: true, slug: true, name: true, description: true },
  })

  let updated = 0
  for (const p of allProducts) {
    // Saltear los que ya se actualizaron arriba (ya tienen el copy v3)
    const isCritical = CRITICAL_PRODUCTS.some((cp) => cp.slug === p.slug)
    if (isCritical) continue

    const newName = sanitize(p.name)
    const newDesc = sanitize(p.description)

    if (newName !== p.name || newDesc !== p.description) {
      await prisma.product.update({
        where: { id: p.id },
        data: { name: newName ?? undefined, description: newDesc ?? undefined },
      })
      console.log(`  ✓ ${p.slug}`)
      if (newName !== p.name) console.log(`    name: "${p.name}" → "${newName}"`)
      if (newDesc !== p.description) console.log(`    desc: cambió`)
      updated++
    }
  }
  console.log(`\n  Total modificados: ${updated} de ${allProducts.length - CRITICAL_PRODUCTS.length}`)

  console.log('\n══ Fase C completada ══\n')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
