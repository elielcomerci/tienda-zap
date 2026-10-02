import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = "postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const allPromos = await prisma.promotion.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { coupons: true, redemptions: true } }
    }
  })
  console.log("ALL PROMOTIONS (count = " + allPromos.length + "):")
  for (const p of allPromos) {
    console.log({
      id: p.id,
      name: p.name,
      status: p.status,
      activeFrom: p.activeFrom,
      activeTo: p.activeTo,
      discountKind: p.discountKind,
      discountValue: p.discountValue,
      couponsCount: p._count.coupons,
      redemptionsCount: p._count.redemptions,
      createdAt: p.createdAt
    })
  }

  const recentCoupons = await prisma.promotionCoupon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      code: true,
      promotionId: true,
      status: true,
      usesLeft: true,
      scanCount: true,
      expiresAt: true,
      createdAt: true
    }
  })
  console.log("RECENT COUPONS:", recentCoupons)

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
