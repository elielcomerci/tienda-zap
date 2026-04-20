import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL as string })
const adapter = new PrismaPg(pool as any)
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zap.com.ar'
  const adminPassword = process.env.ADMIN_PASSWORD || 'cambiar_esta_clave'

  const hash = await bcrypt.hash(adminPassword, 12)
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hash,
      role: 'ADMIN',
      name: 'Admin ZAP',
    },
  })
  console.log(`Admin listo: ${adminEmail}`)

  const categories = [
    { name: 'Carteleria', slug: 'cartelearia' },
    { name: 'Tarjetas personales', slug: 'tarjetas-personales' },
    { name: 'Imanes', slug: 'imanes' },
    { name: 'Stickers', slug: 'stickers' },
    { name: 'Banners', slug: 'banners' },
    { name: 'Folletos', slug: 'folletos' },
  ]

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }
  console.log(`Categorias listas: ${categories.map((category) => category.name).join(', ')}`)

  const activeFrom = new Date()
  activeFrom.setDate(activeFrom.getDate() - 7)

  const activeTo = new Date()
  activeTo.setMonth(activeTo.getMonth() + 12)

  const demoPromotions = [
    {
      id: 'promo_demo_checkout_15',
      name: 'Promo Demo Checkout 15%',
      discountKind: 'PERCENTAGE' as const,
      discountValue: 15,
      maxUses: 50,
      perUserLimit: 1,
      coupons: [
        'ZAP-DEMO15-A',
        'ZAP-DEMO15-B',
        'ZAP-DEMO15-C',
        'ZAP-DEMO15-D',
        'ZAP-DEMO15-E',
      ],
    },
    {
      id: 'promo_demo_checkout_5000',
      name: 'Promo Demo Checkout $5000',
      discountKind: 'FIXED_AMOUNT' as const,
      discountValue: 5000,
      maxUses: 25,
      perUserLimit: 1,
      coupons: [
        'ZAP-FIJO5K-A',
        'ZAP-FIJO5K-B',
        'ZAP-FIJO5K-C',
        'ZAP-FIJO5K-D',
        'ZAP-FIJO5K-E',
      ],
    },
  ]

  for (const promotion of demoPromotions) {
    await prisma.promotion.upsert({
      where: { id: promotion.id },
      update: {
        name: promotion.name,
        type: 'COUPON',
        status: 'ACTIVE',
        priority: 10,
        stackable: false,
        activeFrom,
        activeTo,
        discountKind: promotion.discountKind,
        discountValue: promotion.discountValue,
        maxUses: promotion.maxUses,
        perUserLimit: promotion.perUserLimit,
      },
      create: {
        id: promotion.id,
        name: promotion.name,
        type: 'COUPON',
        status: 'ACTIVE',
        priority: 10,
        stackable: false,
        activeFrom,
        activeTo,
        discountKind: promotion.discountKind,
        discountValue: promotion.discountValue,
        maxUses: promotion.maxUses,
        perUserLimit: promotion.perUserLimit,
      },
    })

    for (const code of promotion.coupons) {
      await prisma.promotionCoupon.upsert({
        where: { code },
        update: {
          promotionId: promotion.id,
          expiresAt: activeTo,
        },
        create: {
          code,
          promotionId: promotion.id,
          status: 'AVAILABLE',
          usesLeft: 1,
          expiresAt: activeTo,
        },
      })
    }
  }

  console.log('Promociones demo listas:')
  for (const promotion of demoPromotions) {
    console.log(`- ${promotion.name}`)
    console.log(`  ${promotion.coupons.join(', ')}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
