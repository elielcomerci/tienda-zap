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

function classify(product) {
  if (product.category.slug === 'sistema') return 'system'
  if (product.isCombo) return 'combo-fixed'
  if (product.category.isService) return 'service-fixed'
  if (product.quoterConfig) return 'costed-quoter'
  if (product.slug === 'remera-personalizada') return 'costed-generated-variants'
  if (product.variants.length > 0) {
    const zero = product.variants.filter((variant) => Number(variant.price || 0) <= 0).length
    if (zero > 0) return 'variants-incomplete'
    const costed = product.variants.filter((variant) => variant.costing).length
    return costed === product.variants.length ? 'variants-costed' : 'variants-priced-no-costing'
  }
  if (Number(product.price || 0) > 0) return 'fixed-price-no-costing'
  return 'no-price-no-costing'
}

async function main() {
  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    include: {
      category: true,
      variants: { select: { price: true, costing: true } },
      quoterConfig: {
        include: {
          allowedMaterials: true,
          finishings: true,
        },
      },
    },
  })

  const rows = products.map((product) => {
    const zeroVariants = product.variants.filter((variant) => Number(variant.price || 0) <= 0).length
    const costedVariants = product.variants.filter((variant) => variant.costing).length
    return {
      product: product.name,
      slug: product.slug,
      category: product.category.name,
      status: classify(product),
      price: product.price,
      variants: product.variants.length,
      zeroVariants,
      costedVariants,
      materials: product.quoterConfig?.allowedMaterials.length || 0,
      finishings: product.quoterConfig?.finishings.length || 0,
    }
  })

  const grouped = rows.reduce((acc, row) => {
    acc[row.status] ||= []
    acc[row.status].push(row)
    return acc
  }, {})

  console.log(JSON.stringify(grouped, null, 2))
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
