import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = "postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const promos = await prisma.promotion.findMany({
    include: {
      coupons: {
        take: 5
      }
    }
  })
  console.log("PROMOTIONS:", JSON.stringify(promos, null, 2))

  const products = await prisma.product.findMany({
    take: 3,
    select: { id: true, name: true, price: true, categoryId: true }
  })
  console.log("PRODUCTS:", JSON.stringify(products, null, 2))

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
