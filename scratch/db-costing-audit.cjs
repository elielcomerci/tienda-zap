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
  const [materials, finishings, quoterConfigs] = await Promise.all([
    prisma.rawMaterial.findMany({
      include: { tiers: { orderBy: { minQty: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.finishingOperation.findMany({
      include: { tiers: { orderBy: { minQty: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
    prisma.productQuoterConfig.findMany({
      include: {
        product: { select: { name: true, slug: true } },
        rawMaterial: { select: { name: true } },
        finishings: { include: { finishing: { select: { name: true } } } },
      },
      orderBy: { product: { name: 'asc' } },
    }),
  ])

  console.log(JSON.stringify({
    materials,
    finishings,
    quoterConfigs: quoterConfigs.map((config) => ({
      product: config.product.name,
      rawMaterial: config.rawMaterial.name,
      itemWidth: config.itemWidth,
      itemHeight: config.itemHeight,
      margin: config.margin,
      bleed: config.bleed,
      profitMargin: config.profitMargin,
      finishings: config.finishings.map((item) => item.finishing.name),
    })),
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
