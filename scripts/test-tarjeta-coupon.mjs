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

  console.log("Tarjeta product options:", tarjetaProduct.options.map(o => ({ name: o.name, values: o.values.map(v => v.value) })))
  if (tarjetaProduct.quoterConfig) {
    console.log("Allowed raw materials:", tarjetaProduct.quoterConfig.allowedMaterials.map(m => m.rawMaterial.name))
  }

  // Find an available coupon
  const coupon = await prisma.promotionCoupon.findFirst({
    where: { status: 'AVAILABLE' },
    include: { promotion: true }
  })

  // Test preview with typical cart options
  try {
    const preview = await previewCheckoutCoupon({
      couponCode: coupon.code,
      items: [
        {
          productId: tarjetaProduct.id,
          quantity: 1,
          selectedOptions: [
            { name: 'Material', value: 'Ilustración 350g' },
            { name: 'Medida', value: '8.5 x 5.5' },
            { name: 'Cantidad', value: '100' },
            { name: 'Terminaciones', value: 'Sin terminaciones' }
          ]
        }
      ]
    })
    console.log("TARJETA PREVIEW RESULT:", JSON.stringify(preview, null, 2))
  } catch (e) {
    console.error("TARJETA PREVIEW ERROR:", e)
  }

  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
