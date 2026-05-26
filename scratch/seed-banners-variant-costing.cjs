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

const MARKUP = 2.5
const shouldApply = process.argv.includes('--apply')

const rows = [
  ['Spider PVC 80x180', 'Frontlight', 35550],
  ['Spider PVC 80x180', 'Blackout', 43000],
  ['1 tensor 90x190', 'Frontlight', 42250],
  ['1 tensor 90x190', 'Blackout', 51150],
  ['2 tensores 90x190', 'Frontlight', 38750],
  ['2 tensores 90x190', 'Blackout', 46900],
  ['Roll-up 85x200', 'Frontlight', 80100],
  ['Roll-up 85x200', 'Blackout', 96900],
  ['Portabanner 150x200', 'Frontlight', 97900],
  ['Portabanner 150x200', 'Blackout', 118500],
  ['Portabanner 200x200', 'Frontlight', 136400],
  ['Portabanner 200x200', 'Blackout', 165050],
  ['Portabanner 300x200', 'Frontlight', 211200],
  ['Portabanner 300x200', 'Blackout', 255600],
]

function optionMap(variant) {
  return Object.fromEntries(
    variant.options.map(({ optionValue }) => [optionValue.option.name, optionValue.value])
  )
}

async function upsertRawMaterial({ name, unitPrice }) {
  const existing = await prisma.rawMaterial.findFirst({ where: { name } })
  if (existing) {
    if (shouldApply) {
      await prisma.rawMaterial.update({
        where: { id: existing.id },
        data: {
          width: 1,
          height: 1,
          unit: 'KIT',
          active: true,
          tiers: {
            deleteMany: {},
            create: [{ minQty: 1, maxQty: null, unitPrice }],
          },
        },
      })
    }
    return existing.id
  }

  if (!shouldApply) return null
  const created = await prisma.rawMaterial.create({
    data: {
      name,
      width: 1,
      height: 1,
      unit: 'KIT',
      active: true,
      tiers: { create: [{ minQty: 1, maxQty: null, unitPrice }] },
    },
  })
  return created.id
}

async function main() {
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug: 'banners' },
    include: {
      variants: {
        include: {
          costing: true,
          options: { include: { optionValue: { include: { option: true } } } },
        },
      },
    },
  })

  const variantsByKey = new Map(
    product.variants.map((variant) => {
      const options = optionMap(variant)
      return [`${options.Formato}__${options.Material}`, variant]
    })
  )

  const actions = []
  for (const [format, material, providerCost] of rows) {
    const variant = variantsByKey.get(`${format}__${material}`)
    if (!variant) {
      actions.push({ format, material, status: 'missing-variant' })
      continue
    }

    const rawMaterialName = `${format} ${material} proveedor`
    const rawMaterialId = await upsertRawMaterial({ name: rawMaterialName, unitPrice: providerCost })

    if (shouldApply) {
      await prisma.productVariantCost.upsert({
        where: { variantId: variant.id },
        create: {
          variantId: variant.id,
          rawMaterialId,
          providerCost,
          markup: MARKUP,
          sourceLabel: 'lista-mega proveedor',
          sourceRef: 'scratch/listas-text/lista-mega.txt#Portabanners',
          notes: 'Costo proveedor sin IVA, incluye estructura e impresion.',
        },
        update: {
          rawMaterialId,
          providerCost,
          markup: MARKUP,
          sourceLabel: 'lista-mega proveedor',
          sourceRef: 'scratch/listas-text/lista-mega.txt#Portabanners',
          notes: 'Costo proveedor sin IVA, incluye estructura e impresion.',
        },
      })
    }

    actions.push({
      format,
      material,
      variantId: variant.id,
      salePrice: variant.price,
      providerCost,
      grossMarginPercent: Math.round(((variant.price - providerCost) / variant.price) * 10000) / 100,
      status: shouldApply ? 'costed' : variant.costing ? 'already-costed' : 'would-cost',
    })
  }

  const costedAfter = shouldApply
    ? await prisma.productVariantCost.count({ where: { variant: { productId: product.id } } })
    : product.variants.filter((variant) => variant.costing).length

  console.log(
    JSON.stringify(
      {
        apply: shouldApply,
        product: product.slug,
        variants: product.variants.length,
        costedVariants: costedAfter,
        actions,
      },
      null,
      2
    )
  )
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
