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

async function main() {
  const products = await prisma.product.findMany({
    where: {
      slug: {
        in: [
          'flyer-volante-simple',
          'tarjetas-personales-estandar',
          'posters-por-medida',
          'vinilo-para-vidriera',
          'cartel-rigido-para-local',
          'senaletica-interior',
        ],
      },
    },
    orderBy: { name: 'asc' },
    include: {
      category: true,
      targetBusinessTypes: true,
      intentions: true,
      quoterConfig: {
        include: {
          allowedMaterials: {
            include: { rawMaterial: { include: { tiers: { orderBy: { minQty: 'asc' } } } } },
          },
          finishings: {
            include: { finishing: { include: { tiers: { orderBy: { minQty: 'asc' } } } } },
          },
          quantityPresets: { orderBy: { sortOrder: 'asc' } },
          sizePresets: { orderBy: { sortOrder: 'asc' } },
        },
      },
    },
  })

  console.log(JSON.stringify(products.map((product) => ({
    name: product.name,
    slug: product.slug,
    category: product.category.name,
    pricingMode: product.quoterConfig?.pricingMode,
    materials: product.quoterConfig?.allowedMaterials.map(({ rawMaterial }) => ({
      name: rawMaterial.name,
      unit: rawMaterial.unit,
      tiers: rawMaterial.tiers.map((tier) => ({ minQty: tier.minQty, unitPrice: tier.unitPrice })),
    })),
    finishings: product.quoterConfig?.finishings.map(({ finishing }) => ({
      name: finishing.name,
      type: finishing.type,
      tiers: finishing.tiers.map((tier) => ({ minQty: tier.minQty, unitPrice: tier.unitPrice })),
    })),
    quantities: product.quoterConfig?.quantityPresets.map((preset) => preset.quantity),
    sizes: product.quoterConfig?.sizePresets.map((preset) => ({
      label: preset.label,
      width: preset.width,
      height: preset.height,
    })),
    intentions: product.intentions.map((intention) => intention.name),
    rubros: product.targetBusinessTypes.map((businessType) => businessType.name),
  })), null, 2))
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
