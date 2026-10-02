import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = "postgresql://neondb_owner:npg_R0JyeVjX1NSI@ep-super-butterfly-ane1zynb-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

import { previewCheckoutCoupon } from '../src/lib/coupons.ts'

async function main() {
  const tarjetaProduct = await prisma.product.findUnique({
    where: { id: 'cmn84zht0000004if49k48ua8' },
    include: {
      category: true,
      options: { include: { values: true } },
      quoterConfig: {
        include: {
          rawMaterial: true,
          allowedMaterials: { include: { rawMaterial: true } },
          finishings: { include: { finishing: true } }
        }
      }
    }
  })

  // Find an available coupon
  const coupon = await prisma.promotionCoupon.findFirst({
    where: { status: 'AVAILABLE' },
    include: { promotion: true }
  })

  try {
    const preview = await previewCheckoutCoupon({
      couponCode: coupon.code,
      items: [
        {
          productId: tarjetaProduct.id,
          quantity: 1,
          selectedOptions: [
            { name: 'Sustrato', value: 'Papel Ilustración 350g (4/0 - Frente)' },
            { name: 'Medida', value: '9x5 cm' },
            { name: 'Cantidad', value: '100' },
            { name: 'Terminaciones', value: 'Sin terminaciones' }
          ]
        }
      ]
    })
    console.log("TARJETA PREVIEW RESULT WITH SUSTRATO:", JSON.stringify(preview, null, 2))
  } catch (e) {
    console.error("TARJETA PREVIEW ERROR WITH SUSTRATO:", e)
  }

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
