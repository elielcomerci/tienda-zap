import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = "postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Let's import coupons evaluation functions
import { evaluateCheckoutPricing, previewCheckoutCoupon } from '../src/lib/coupons.ts'

async function main() {
  const product = await prisma.product.findFirst({
    where: { active: true },
    include: {
      category: true,
      options: { include: { values: true } },
      quoterConfig: {
        include: {
          rawMaterial: true,
          finishings: { include: { finishing: true } }
        }
      }
    }
  })

  console.log("Found product:", product.id, product.name, "Quoter:", Boolean(product.quoterConfig))

  // Find an available coupon
  const coupon = await prisma.promotionCoupon.findFirst({
    where: { status: 'AVAILABLE' },
    include: { promotion: true }
  })
  console.log("Found coupon:", coupon.code, "Promo:", coupon.promotion.name, "ActiveFrom:", coupon.promotion.activeFrom, "ActiveTo:", coupon.promotion.activeTo, "Status:", coupon.promotion.status)

  // Test preview
  try {
    const preview = await previewCheckoutCoupon({
      couponCode: coupon.code,
      items: [
        {
          productId: product.id,
          quantity: 1,
          selectedOptions: product.quoterConfig ? [
            { name: 'Material', value: 'Ilustración 350g' },
            { name: 'Medida', value: '8.5 x 5.5' },
            { name: 'Cantidad', value: '100' },
            { name: 'Terminaciones', value: 'Sin terminaciones' }
          ] : []
        }
      ]
    })
    console.log("PREVIEW RESULT:", JSON.stringify(preview, null, 2))
  } catch (e) {
    console.error("PREVIEW ERROR:", e)
  }

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
