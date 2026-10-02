import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = "postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      active: true,
      options: {
        select: { name: true }
      },
      quoterConfig: {
        select: { id: true }
      },
      variants: {
        select: { id: true, price: true }
      }
    }
  })
  console.log("PRODUCTS COUNT:", products.length)
  for (const p of products) {
    console.log({
      id: p.id,
      name: p.name,
      price: p.price,
      active: p.active,
      options: p.options.map(o => o.name),
      hasQuoter: Boolean(p.quoterConfig),
      variantsCount: p.variants.length
    })
  }

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
