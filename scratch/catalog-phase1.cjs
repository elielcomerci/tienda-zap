const fs = require('fs')
const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (!match) continue
    const key = match[1].trim()
    const value = match[2].trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) process.env[key] = value
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const categoryMerges = [
  { from: 'folletos', to: 'flyers-y-folletos' },
  { from: 'stickers', to: 'stickers-y-etiquetas' },
]

const businessTypeCategories = {
  gastronomia: [
    'flyers-y-folletos',
    'carteleria',
    'stickers-y-etiquetas',
    'imanes',
    'merchandising',
    'displays-y-exhibidores',
    'web-y-digital',
  ],
  inmobiliarias: [
    'carteleria',
    'banners',
    'carpetas-y-presentaciones',
    'flyers-y-folletos',
    'tarjetas-personales',
    'web-y-digital',
    'ploteo-vehicular',
  ],
  'belleza-y-salud': [
    'tarjetas-personales',
    'flyers-y-folletos',
    'stickers-y-etiquetas',
    'merchandising',
    'carteleria',
    'web-y-digital',
    'calendarios',
  ],
  'gym-y-yoga': [
    'flyers-y-folletos',
    'carteleria',
    'banners',
    'calendarios',
    'web-y-digital',
    'ploteo-vehicular',
  ],
  'moda-y-showrooms': [
    'merchandising',
    'stickers-y-etiquetas',
    'tarjetas-personales',
    'web-y-digital',
    'flyers-y-folletos',
    'carteleria',
  ],
  'retail-y-comercios': [
    'carteleria',
    'displays-y-exhibidores',
    'stickers-y-etiquetas',
    'flyers-y-folletos',
    'tarjetas-personales',
    'merchandising',
    'web-y-digital',
    'banners',
    'imanes',
  ],
  'eventos-y-btl': [
    'banners',
    'displays-y-exhibidores',
    'flyers-y-folletos',
    'merchandising',
    'carteleria',
    'gigantografias',
    'stickers-y-etiquetas',
    'web-y-digital',
  ],
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const merges = []

    for (const merge of categoryMerges) {
      const [source, target] = await Promise.all([
        tx.category.findUnique({
          where: { slug: merge.from },
          include: { businessTypes: { select: { id: true } }, products: { select: { id: true } } },
        }),
        tx.category.findUnique({ where: { slug: merge.to }, select: { id: true, name: true } }),
      ])

      if (!source || !target) {
        merges.push({ ...merge, status: 'skipped', reason: 'missing source or target' })
        continue
      }

      await tx.product.updateMany({
        where: { categoryId: source.id },
        data: { categoryId: target.id },
      })

      if (source.businessTypes.length > 0) {
        for (const businessType of source.businessTypes) {
          await tx.businessType.update({
            where: { id: businessType.id },
            data: { categories: { connect: { id: target.id } } },
          })
        }
      }

      await tx.category.delete({ where: { id: source.id } })
      merges.push({
        ...merge,
        status: 'merged',
        movedProducts: source.products.length,
        movedBusinessTypeLinks: source.businessTypes.length,
      })
    }

    const verticals = []
    for (const [businessTypeSlug, categorySlugs] of Object.entries(businessTypeCategories)) {
      const categories = await tx.category.findMany({
        where: { slug: { in: categorySlugs } },
        select: { id: true, slug: true },
      })

      await tx.businessType.update({
        where: { slug: businessTypeSlug },
        data: { categories: { set: categories.map((category) => ({ id: category.id })) } },
      })

      verticals.push({
        businessTypeSlug,
        requestedCategories: categorySlugs.length,
        connectedCategories: categories.map((category) => category.slug).sort(),
      })
    }

    return { merges, verticals }
  }, { timeout: 30000 })

  const summary = await prisma.businessType.findMany({
    select: {
      name: true,
      slug: true,
      categories: {
        select: {
          name: true,
          slug: true,
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  console.log(JSON.stringify({ result, summary }, null, 2))
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
