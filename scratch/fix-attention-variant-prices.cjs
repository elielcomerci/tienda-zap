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
const shouldApply = process.argv.includes('--apply')

const inferredPrices = [
  {
    slug: 'cartel-venta-alquiler',
    match: { Sustrato: 'Plástico Corrugado', Medida: '1 x 0.75' },
    price: 67900,
    rationale: 'Inferido desde 70x50 corrugado y escala de medidas del mismo producto.',
  },
  {
    slug: 'cartel-venta-alquiler',
    match: { Sustrato: 'Plástico Corrugado', Medida: '1.5 x 1' },
    price: 122900,
    rationale: 'Inferido desde 70x50 corrugado y escala de medidas del mismo producto.',
  },
  {
    slug: 'block-anotador-personalizado',
    match: { Presentación: 'Abrochado', Hojas: '100' },
    price: 5900,
    rationale: 'Precio temporal coherente entre abrochado 50 hojas y espiral 100 hojas.',
  },
  {
    slug: 'block-anotador-personalizado',
    match: { Presentación: 'Espiral', Hojas: '50' },
    price: 5200,
    rationale: 'Precio temporal coherente entre abrochado 50 hojas y espiral 100 hojas.',
  },
]

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function optionMap(variant) {
  const map = {}
  for (const selected of variant.options) {
    map[selected.optionValue.option.name] = selected.optionValue.value
  }
  return map
}

function matchesOptions(options, expected) {
  return Object.entries(expected).every(
    ([name, value]) => normalize(options[name]) === normalize(value)
  )
}

async function main() {
  const products = await prisma.product.findMany({
    where: { slug: { in: [...new Set(inferredPrices.map((entry) => entry.slug))] } },
    include: {
      variants: {
        include: {
          options: {
            include: {
              optionValue: { include: { option: true } },
            },
          },
        },
      },
    },
  })

  const changes = []

  for (const rule of inferredPrices) {
    const product = products.find((entry) => entry.slug === rule.slug)
    if (!product) {
      changes.push({ ...rule, status: 'product-not-found' })
      continue
    }

    const variant = product.variants.find((entry) => matchesOptions(optionMap(entry), rule.match))
    if (!variant) {
      changes.push({ ...rule, product: product.name, status: 'variant-not-found' })
      continue
    }

    changes.push({
      product: product.name,
      slug: product.slug,
      variantId: variant.id,
      options: optionMap(variant),
      previousPrice: variant.price,
      nextPrice: rule.price,
      rationale: rule.rationale,
      status: shouldApply ? 'updated' : 'dry-run',
    })

    if (shouldApply && Number(variant.price || 0) <= 0) {
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: { price: rule.price },
      })
    }
  }

  console.log(JSON.stringify({ applied: shouldApply, changes }, null, 2))
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
