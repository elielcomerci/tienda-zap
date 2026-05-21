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

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const slugs = [
  'flyer-volante-simple',
  'tarjetas-personales-estandar',
  'tarjetas-postales',
  'posters-por-medida',
  'sobres-personalizados',
  'plancha-de-iman-impreso',
  'vinilo-para-vidriera',
  'cartel-rigido-para-local',
  'roll-up-y-portabanner',
  'senaletica-interior',
  'cuadernos-personalizados',
]

async function main() {
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      name: true,
      options: { select: { name: true, values: { select: { value: true } } } },
      variants: { select: { id: true, price: true } },
    },
    orderBy: { slug: 'asc' },
  })
  console.log(JSON.stringify(products, null, 2))
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
