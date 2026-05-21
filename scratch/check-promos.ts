import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const promotions = await prisma.promotion.findMany({
    select: {
      id: true,
      name: true,
      welcomeLogoUrl: true,
      audienceLabel: true,
    }
  })
  
  console.log('--- PROMOTIONS ---')
  console.dir(promotions, { depth: null })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
