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

async function main() {
  const shouldFix = process.argv.includes('--fix')
  const product = await prisma.product.findUniqueOrThrow({
    where: { slug: 'remera-personalizada' },
    select: { id: true, name: true },
  })

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    include: {
      options: {
        include: {
          optionValue: {
            include: { option: true },
          },
        },
      },
    },
    orderBy: { id: 'asc' },
  })

  const signatures = new Map()
  const orphanVariantIds = []
  const duplicateVariantIds = []

  for (const variant of variants) {
    const entries = variant.options
      .map((entry) => [entry.optionValue.option.name, entry.optionValue.value])
      .sort(([left], [right]) => left.localeCompare(right))

    if (entries.length === 0) {
      orphanVariantIds.push(variant.id)
      continue
    }

    const signature = entries.map(([name, value]) => `${name}:${value}`).join('|')
    if (signatures.has(signature)) {
      duplicateVariantIds.push(variant.id)
    } else {
      signatures.set(signature, variant.id)
    }
  }

  if (shouldFix && orphanVariantIds.length > 0) {
    await prisma.productVariant.deleteMany({
      where: { id: { in: orphanVariantIds } },
    })
  }

  console.log(JSON.stringify({
    product: product.name,
    variants: variants.length,
    pricedVariants: variants.filter((variant) => Number(variant.price || 0) > 0).length,
    zeroVariants: variants.filter((variant) => Number(variant.price || 0) <= 0).length,
    orphanVariantIds,
    duplicateVariantIds,
    fixed: shouldFix ? { deletedOrphans: orphanVariantIds.length } : undefined,
  }, null, 2))
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
