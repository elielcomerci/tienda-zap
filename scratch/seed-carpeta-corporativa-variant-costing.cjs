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

function optionMap(variant) {
  return Object.fromEntries(
    variant.options.map(({ optionValue }) => [optionValue.option.name, optionValue.value])
  )
}

function rawMaterialName(options) {
  return `Carpeta A4 ${options.Terminacion} ${options.Impresion} ${options.Solapa} x${options.Cantidad}`
}

async function main() {
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug: 'carpeta-corporativa' },
    include: {
      variants: {
        include: {
          costing: true,
          options: { include: { optionValue: { include: { option: true } } } },
        },
      },
    },
  })

  const materialNames = product.variants.map((variant) => rawMaterialName(optionMap(variant)))
  const rawMaterials = await prisma.rawMaterial.findMany({
    where: { name: { in: materialNames } },
    include: { tiers: { orderBy: { minQty: 'asc' } } },
  })
  const materialsByName = new Map(rawMaterials.map((material) => [material.name, material]))

  const actions = []
  for (const variant of product.variants) {
    const options = optionMap(variant)
    const materialName = rawMaterialName(options)
    const rawMaterial = materialsByName.get(materialName)
    const providerCost = rawMaterial?.tiers[0]?.unitPrice

    if (!rawMaterial || !providerCost) {
      actions.push({
        variantId: variant.id,
        sku: variant.sku,
        materialName,
        status: 'missing-raw-material',
      })
      continue
    }

    if (shouldApply) {
      await prisma.productVariantCost.upsert({
        where: { variantId: variant.id },
        create: {
          variantId: variant.id,
          rawMaterialId: rawMaterial.id,
          providerCost,
          markup: MARKUP,
          sourceLabel: 'lista proveedor carpetas',
          sourceRef: 'scratch/seed-provider-print-batch.cjs#folderTiers',
          notes: 'Costo proveedor por tanda segun terminacion, impresion, solapa y cantidad.',
        },
        update: {
          rawMaterialId: rawMaterial.id,
          providerCost,
          markup: MARKUP,
          sourceLabel: 'lista proveedor carpetas',
          sourceRef: 'scratch/seed-provider-print-batch.cjs#folderTiers',
          notes: 'Costo proveedor por tanda segun terminacion, impresion, solapa y cantidad.',
        },
      })
    }

    actions.push({
      variantId: variant.id,
      sku: variant.sku,
      salePrice: variant.price,
      providerCost,
      grossMarginPercent: Math.round(((variant.price - providerCost) / variant.price) * 10000) / 100,
      status: shouldApply ? 'costed' : variant.costing ? 'already-costed' : 'would-cost',
    })
  }

  const missing = actions.filter((action) => action.status === 'missing-raw-material')
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
        missingRawMaterials: missing.length,
        actions: missing.length > 0 ? actions : actions.slice(0, 10),
        omittedActions: missing.length > 0 ? 0 : Math.max(0, actions.length - 10),
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
