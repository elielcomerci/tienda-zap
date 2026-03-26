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
  console.log(`✅ Admin creado: ${adminEmail}`)

  const cats = [
    { name: 'Cartelería', slug: 'cartelearia' },
    { name: 'Tarjetas personales', slug: 'tarjetas-personales' },
    { name: 'Imanes', slug: 'imanes' },
    { name: 'Stickers', slug: 'stickers' },
    { name: 'Banners', slug: 'banners' },
    { name: 'Folletos', slug: 'folletos' },
  ]

  for (const cat of cats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
  }
  console.log(`✅ Categorías creadas: ${cats.map((c) => c.name).join(', ')}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
