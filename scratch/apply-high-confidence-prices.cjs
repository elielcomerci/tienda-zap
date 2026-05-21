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

const rows = JSON.parse(fs.readFileSync('scratch/pricing-proposal.json', 'utf8'))
const updates = rows.filter(
  (row) => row.currentPrice <= 0 && row.providerCost !== null && row.confidence === 'high'
)

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const result = []
  await prisma.$transaction(async (tx) => {
    for (const row of updates) {
      const variant = await tx.productVariant.update({
        where: { id: row.variantId },
        data: { price: row.suggestedPrice },
        select: {
          id: true,
          price: true,
          product: { select: { name: true } },
        },
      })
      result.push({
        product: variant.product.name,
        variantId: variant.id,
        price: variant.price,
        source: row.source,
      })
    }
  }, { timeout: 30000 })

  console.log(JSON.stringify({ updated: result.length, result }, null, 2))
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
