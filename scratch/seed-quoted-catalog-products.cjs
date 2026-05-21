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

const MARKUP_MARGIN = 150

async function upsertMaterial({ name, width, height, unit, tiers }) {
  const existing = await prisma.rawMaterial.findFirst({ where: { name } })
  if (existing) {
    await prisma.rawMaterial.update({
      where: { id: existing.id },
      data: {
        width,
        height,
        unit,
        active: true,
        tiers: {
          deleteMany: {},
          create: tiers,
        },
      },
    })
    return existing.id
  }

  const created = await prisma.rawMaterial.create({
    data: {
      name,
      width,
      height,
      unit,
      active: true,
      tiers: { create: tiers },
    },
  })
  return created.id
}

async function upsertFinishing({ name, costType, tiers }) {
  const existing = await prisma.finishingOperation.findFirst({ where: { name } })
  if (existing) {
    await prisma.finishingOperation.update({
      where: { id: existing.id },
      data: {
        costType,
        active: true,
        tiers: {
          deleteMany: {},
          create: tiers,
        },
      },
    })
    return existing.id
  }

  const created = await prisma.finishingOperation.create({
    data: {
      name,
      costType,
      active: true,
      tiers: { create: tiers },
    },
  })
  return created.id
}

async function materialId(name) {
  const material = await prisma.rawMaterial.findFirstOrThrow({ where: { name } })
  return material.id
}

async function createQuotedProduct(definition) {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: definition.categorySlug } })
  const existing = await prisma.product.findUnique({ where: { slug: definition.slug } })
  if (existing) {
    await prisma.product.delete({ where: { id: existing.id } })
  }

  const product = await prisma.product.create({
    data: {
      name: definition.name,
      slug: definition.slug,
      description: definition.description,
      price: 0,
      images: [],
      categoryId: category.id,
      active: true,
      stock: 100,
      creditDownPaymentPercent: 30,
      intentions: {
        connect: definition.intentionSlugs.map((slug) => ({ slug })),
      },
      targetBusinessTypes: {
        connect: (definition.businessTypeSlugs || []).map((slug) => ({ slug })),
      },
      quoterConfig: {
        create: {
          pricingMode: definition.pricingMode,
          itemWidth: definition.itemWidth ?? null,
          itemHeight: definition.itemHeight ?? null,
          margin: definition.margin ?? 1,
          bleed: definition.bleed ?? 0.2,
          profitMargin: MARKUP_MARGIN,
          minProfitMargin: definition.minProfitMargin ?? 120,
          maxProfitMargin: definition.maxProfitMargin ?? 180,
          allowCustomSize: false,
          allowedMaterials: {
            create: definition.materialIds.map((rawMaterialId) => ({ rawMaterialId })),
          },
          finishings: {
            create: definition.finishingIds.map((finishingId) => ({ finishingId })),
          },
          quantityPresets: {
            create: definition.quantities.map((quantity, index) => ({
              quantity,
              sortOrder: index,
            })),
          },
          sizePresets: {
            create: definition.sizes.map((size, index) => ({
              ...size,
              sortOrder: index,
            })),
          },
        },
      },
    },
  })

  return product.slug
}

async function main() {
  const areaMaterials = [
    ['Vinilo promo brillo o mate', 10300],
    ['Vinilo primera marca brillo o mate', 12850],
    ['Vinilo base gris / negra', 14100],
    ['Vinilo backlight', 16500],
    ['Vinilo transparente clear', 12750],
    ['Vinilo microperforado', 17200],
    ['PVC 3 mm impresión UV', 26400],
    ['P.A.I. 1 mm impresión UV', 26400],
    ['Corrugado plástico 2,02 mm impresión UV', 11550],
  ]

  for (const [name, unitPrice] of areaMaterials) {
    await upsertMaterial({
      name,
      width: 100,
      height: 100,
      unit: 'M2',
      tiers: [{ minQty: 1, maxQty: null, unitPrice }],
    })
  }

  const viniloLaminado = await upsertFinishing({
    name: 'Laminado transparente para vinilo',
    costType: 'PER_SHEET',
    tiers: [{ minQty: 1, maxQty: null, unitPrice: 14150 }],
  })
  const viniloAltoTransito = await upsertFinishing({
    name: 'Laminado alto tránsito para vinilo',
    costType: 'PER_SHEET',
    tiers: [{ minQty: 1, maxQty: null, unitPrice: 16250 }],
  })
  const medioCorteVinilo = await upsertFinishing({
    name: 'Medio corte de vinilo',
    costType: 'PER_SHEET',
    tiers: [{ minQty: 1, maxQty: null, unitPrice: 7150 }],
  })
  const refiladoPlaca = await upsertFinishing({
    name: 'Refilado de placas',
    costType: 'PER_UNIT',
    tiers: [{ minQty: 1, maxQty: null, unitPrice: 1000 }],
  })

  const created = []

  created.push(await createQuotedProduct({
    name: 'Flyer / Volante simple',
    slug: 'flyer-volante-simple',
    description: 'Volantes y flyers para promociones, eventos, lanzamientos y comunicación comercial.',
    categorySlug: 'flyers-y-folletos',
    intentionSlugs: ['repartir-y-promocionar', 'que-me-vean-en-la-calle'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'moda-y-showrooms',
      'retail-y-comercios',
      'eventos-y-btl',
    ],
    pricingMode: 'SHEET_NESTING',
    materialIds: [
      await materialId('Papel Ilustración 150g (4/0 - Frente)'),
      await materialId('Papel Ilustración 150g (4/4 - Frente y Dorso)'),
      await materialId('Papel Obra 80g (4/0 - Frente)'),
      await materialId('Papel Obra 80g (4/4 - Frente y Dorso)'),
    ],
    finishingIds: [],
    quantities: [100, 200, 300, 500, 1000],
    sizes: [
      { label: '10x10 cm', width: 10, height: 10 },
      { label: '10x15 cm', width: 10, height: 15 },
      { label: '15x21 cm', width: 15, height: 21 },
      { label: 'A4', width: 21, height: 29.7 },
    ],
  }))

  created.push(await createQuotedProduct({
    name: 'Tarjetas personales estándar',
    slug: 'tarjetas-personales-estandar',
    description: 'Tarjetas comerciales en papel ilustración 300g, con terminaciones opcionales.',
    categorySlug: 'tarjetas-personales',
    intentionSlugs: ['dar-confianza-y-seriedad', 'para-que-se-acuerden-de-mi', 'repartir-y-promocionar'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'moda-y-showrooms',
      'retail-y-comercios',
      'eventos-y-btl',
    ],
    pricingMode: 'SHEET_NESTING',
    materialIds: [
      await materialId('Papel Ilustración 300g (4/0 - Frente)'),
      await materialId('Papel Ilustración 300g (4/4 - Frente y Dorso)'),
    ],
    finishingIds: [
      await upsertFinishing({ name: 'Laca UV', costType: 'PER_SHEET', tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 136 },
        { minQty: 11, maxQty: 50, unitPrice: 126 },
        { minQty: 51, maxQty: 100, unitPrice: 116 },
        { minQty: 101, maxQty: 500, unitPrice: 106 },
        { minQty: 501, maxQty: null, unitPrice: 99 },
      ] }),
      await upsertFinishing({ name: 'Laminado Brillante', costType: 'PER_SHEET', tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 328 },
        { minQty: 11, maxQty: 50, unitPrice: 302 },
        { minQty: 51, maxQty: 100, unitPrice: 280 },
        { minQty: 101, maxQty: 500, unitPrice: 254 },
        { minQty: 501, maxQty: null, unitPrice: 238 },
      ] }),
      await upsertFinishing({ name: 'Laminado Mate', costType: 'PER_SHEET', tiers: [
        { minQty: 1, maxQty: 10, unitPrice: 380 },
        { minQty: 11, maxQty: 50, unitPrice: 350 },
        { minQty: 51, maxQty: 100, unitPrice: 322 },
        { minQty: 101, maxQty: 500, unitPrice: 294 },
        { minQty: 501, maxQty: null, unitPrice: 276 },
      ] }),
    ],
    quantities: [100, 200, 300, 500, 1000],
    sizes: [{ label: '9x5 cm', width: 9, height: 5 }],
  }))

  created.push(await createQuotedProduct({
    name: 'Pósters por medida',
    slug: 'posters-por-medida',
    description: 'Pósters impresos por medida para locales, eventos, vidrieras, campañas y decoración comercial.',
    categorySlug: 'carteleria',
    intentionSlugs: ['que-me-vean-en-la-calle', 'repartir-y-promocionar'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'moda-y-showrooms',
      'retail-y-comercios',
      'eventos-y-btl',
    ],
    pricingMode: 'SHEET_NESTING',
    materialIds: [
      await materialId('Papel Ilustración 150g (4/0 - Frente)'),
      await materialId('Papel Ilustración 115g (4/0 - Frente)'),
      await materialId('Papel Obra 90g (4/0 - Frente)'),
      await materialId('Papel Obra 80g (4/0 - Frente)'),
    ],
    finishingIds: [],
    quantities: [1, 25, 50, 100, 300, 500, 1000],
    sizes: [
      { label: 'A4', width: 21, height: 29.7 },
      { label: 'A3', width: 29.7, height: 42 },
    ],
  }))

  created.push(await createQuotedProduct({
    name: 'Vinilo para vidriera',
    slug: 'vinilo-para-vidriera',
    description: 'Vinilos impresos para vidrieras, promociones, locales, horarios, gráfica comercial y decoración.',
    categorySlug: 'carteleria',
    intentionSlugs: ['que-me-vean-en-la-calle'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'moda-y-showrooms',
      'retail-y-comercios',
    ],
    pricingMode: 'AREA_M2',
    materialIds: [
      await materialId('Vinilo promo brillo o mate'),
      await materialId('Vinilo primera marca brillo o mate'),
      await materialId('Vinilo base gris / negra'),
      await materialId('Vinilo backlight'),
      await materialId('Vinilo transparente clear'),
      await materialId('Vinilo microperforado'),
    ],
    finishingIds: [viniloLaminado, viniloAltoTransito, medioCorteVinilo],
    quantities: [1],
    sizes: [
      { label: '50x50 cm', width: 50, height: 50 },
      { label: '100x100 cm', width: 100, height: 100 },
      { label: '200x100 cm', width: 200, height: 100 },
    ],
  }))

  created.push(await createQuotedProduct({
    name: 'Cartel rígido para local',
    slug: 'cartel-rigido-para-local',
    description: 'Carteles rígidos impresos en cama plana para frentes, locales, señalización y comunicación visual.',
    categorySlug: 'carteleria',
    intentionSlugs: ['que-me-vean-en-la-calle', 'dar-confianza-y-seriedad'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'retail-y-comercios',
      'eventos-y-btl',
    ],
    pricingMode: 'AREA_M2',
    materialIds: [
      await materialId('PVC 3 mm impresión UV'),
      await materialId('P.A.I. 1 mm impresión UV'),
      await materialId('Corrugado plástico 2,02 mm impresión UV'),
    ],
    finishingIds: [refiladoPlaca],
    quantities: [1],
    sizes: [
      { label: '70x50 cm', width: 70, height: 50 },
      { label: '100x75 cm', width: 100, height: 75 },
      { label: '150x100 cm', width: 150, height: 100 },
    ],
  }))

  created.push(await createQuotedProduct({
    name: 'Señalética interior',
    slug: 'senaletica-interior',
    description: 'Señalética rígida para orientación, normas, horarios, direccionales y comunicación interna.',
    categorySlug: 'senaletica',
    intentionSlugs: ['dar-confianza-y-seriedad', 'que-me-vean-en-la-calle'],
    businessTypeSlugs: [
      'gastronomia',
      'inmobiliarias',
      'belleza-y-salud',
      'gym-y-yoga',
      'retail-y-comercios',
      'eventos-y-btl',
    ],
    pricingMode: 'AREA_M2',
    materialIds: [
      await materialId('PVC 3 mm impresión UV'),
      await materialId('P.A.I. 1 mm impresión UV'),
      await materialId('Corrugado plástico 2,02 mm impresión UV'),
    ],
    finishingIds: [refiladoPlaca],
    quantities: [1],
    sizes: [
      { label: '20x30 cm', width: 20, height: 30 },
      { label: '30x40 cm', width: 30, height: 40 },
      { label: 'A4', width: 21, height: 29.7 },
      { label: 'A3', width: 29.7, height: 42 },
    ],
  }))

  console.log(JSON.stringify({ created }, null, 2))
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
