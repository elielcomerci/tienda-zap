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

const MARKUP = 2.5

function sellPrice(cost) {
  return Math.round(cost * MARKUP)
}

const folletoCosts = {
  'Ilustración|Color|Frente|10x15|100': 8445,
  'Ilustración|Color|Frente y dorso|10x15|100': 11888,
  'Ilustración|Color|Frente|15x21|100': 17151,
  'Ilustración|Color|Frente y dorso|15x21|100': 24232,
  'Ilustración|Color|Frente|10x15|200': 15539,
  'Ilustración|Color|Frente y dorso|10x15|200': 21875,
  'Ilustración|Color|Frente|15x21|200': 31557,
  'Ilustración|Color|Frente y dorso|15x21|200': 44586,
  'Ilustración|Color|Frente|10x15|500': 36737,
  'Ilustración|Color|Frente y dorso|10x15|500': 51715,
  'Ilustración|Color|Frente|15x21|500': 74605,
  'Ilustración|Color|Frente y dorso|15x21|500': 105408,
  'Ilustración|Color|Frente|10x15|1000': 71110,
  'Ilustración|Color|Frente y dorso|10x15|1000': 100101,
  'Ilustración|Color|Frente|15x21|1000': 144408,
  'Ilustración|Color|Frente y dorso|15x21|1000': 204031,
  'Ilustración|Blanco y Negro|Frente|10x15|100': 2768,
  'Ilustración|Blanco y Negro|Frente y dorso|10x15|100': 3756,
  'Ilustración|Blanco y Negro|Frente|15x21|100': 5551,
  'Ilustración|Blanco y Negro|Frente y dorso|15x21|100': 7608,
  'Ilustración|Blanco y Negro|Frente|10x15|200': 5173,
  'Ilustración|Blanco y Negro|Frente y dorso|10x15|200': 7065,
  'Ilustración|Blanco y Negro|Frente|15x21|200': 10951,
  'Ilustración|Blanco y Negro|Frente y dorso|15x21|200': 15066,
  'Ilustración|Blanco y Negro|Frente|10x15|500': 11819,
  'Ilustración|Blanco y Negro|Frente y dorso|10x15|500': 16172,
  'Ilustración|Blanco y Negro|Frente|15x21|500': 24280,
  'Ilustración|Blanco y Negro|Frente y dorso|15x21|500': 33424,
  'Ilustración|Blanco y Negro|Frente|10x15|1000': 22107,
  'Ilustración|Blanco y Negro|Frente y dorso|10x15|1000': 30300,
  'Ilustración|Blanco y Negro|Frente|15x21|1000': 48360,
  'Ilustración|Blanco y Negro|Frente y dorso|15x21|1000': 66648,
  'Obra|Color|Frente|10x15|100': 7601,
  'Obra|Color|Frente y dorso|10x15|100': 10700,
  'Obra|Color|Frente|15x21|100': 15436,
  'Obra|Color|Frente y dorso|15x21|100': 21809,
  'Obra|Color|Frente|10x15|200': 13986,
  'Obra|Color|Frente y dorso|10x15|200': 19687,
  'Obra|Color|Frente|15x21|200': 28401,
  'Obra|Color|Frente y dorso|15x21|200': 40128,
  'Obra|Color|Frente|10x15|500': 33064,
  'Obra|Color|Frente y dorso|10x15|500': 46543,
  'Obra|Color|Frente|15x21|500': 67144,
  'Obra|Color|Frente y dorso|15x21|500': 94867,
  'Obra|Color|Frente|10x15|1000': 63999,
  'Obra|Color|Frente y dorso|10x15|1000': 90091,
  'Obra|Color|Frente|15x21|1000': 129967,
  'Obra|Color|Frente y dorso|15x21|1000': 183628,
  'Obra|Blanco y Negro|Frente|10x15|100': 2491,
  'Obra|Blanco y Negro|Frente y dorso|10x15|100': 3380,
  'Obra|Blanco y Negro|Frente|15x21|100': 4995,
  'Obra|Blanco y Negro|Frente y dorso|15x21|100': 6847,
  'Obra|Blanco y Negro|Frente|10x15|200': 4655,
  'Obra|Blanco y Negro|Frente y dorso|10x15|200': 6359,
  'Obra|Blanco y Negro|Frente|15x21|200': 9856,
  'Obra|Blanco y Negro|Frente y dorso|15x21|200': 13559,
  'Obra|Blanco y Negro|Frente|10x15|500': 10637,
  'Obra|Blanco y Negro|Frente y dorso|10x15|500': 14555,
  'Obra|Blanco y Negro|Frente|15x21|500': 21852,
  'Obra|Blanco y Negro|Frente y dorso|15x21|500': 30082,
  'Obra|Blanco y Negro|Frente|10x15|1000': 19896,
  'Obra|Blanco y Negro|Frente y dorso|10x15|1000': 27270,
  'Obra|Blanco y Negro|Frente|15x21|1000': 43524,
  'Obra|Blanco y Negro|Frente y dorso|15x21|1000': 59984,
}

const surfaceCosts = {
  'Gigantografías|Lona': 10300,
  'Gigantografías|Vinilo': 10300,
  'Gigantografías|Microperforado': 12750,
  'Cartel Lona Impresión UV|Lona Frontlight': 10300,
  'Cartel Lona Impresión UV|Lona Backlight': 11300,
  'Cartel Lona Impresión UV|Lona Mate': 10300,
  'Cartel Lona Impresión UV|Blackout': 12350,
  'Cartel Lona Impresión UV|Blackout doble faz': 21650,
  'Cartel Lona Impresión UV|Mesh': 25950,
}

function optionMap(variant) {
  const map = {}
  for (const selected of variant.options) {
    map[selected.optionValue.option.name.trim()] = selected.optionValue.value.trim()
  }
  return map
}

async function main() {
  const products = await prisma.product.findMany({
    where: {
      slug: {
        in: [
          'folleto',
          'gigantografias',
          'cartel-lona-impresion-uv',
          'banners',
          'cartel-venta-alquiler',
          'calendario',
          'carpeta-corporativa',
          'imanes',
          'block-anotador-personalizado',
          'ploteo-vehicular',
        ],
      },
    },
    include: {
      variants: {
        include: {
          options: {
            include: {
              optionValue: { include: { option: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = []

  for (const product of products) {
    for (const variant of product.variants) {
      const options = optionMap(variant)
      let cost = null
      let confidence = 'none'
      let source = ''
      let note = ''

      if (product.slug === 'folleto') {
        const key = [
          options.Sustrato,
          options.Color,
          options['Impresión'],
          options['Tamaño'],
          options.Cantidad,
        ].join('|')
        cost = folletoCosts[key] ?? null
        confidence = cost === null ? 'none' : options.Sustrato === 'Obra' ? 'medium' : 'high'
        source = cost === null ? '' : 'lista-low.pdf, Folletos'
        note = options.Sustrato === 'Obra'
          ? 'Match con tabla Papel 80g Ilustración; revisar si corresponde a Obra.'
          : ''
      }

      if (['gigantografias', 'cartel-lona-impresion-uv'].includes(product.slug)) {
        const material = options.Impresión || options.Sustrato
        const key = `${product.name}|${material}`
        cost = surfaceCosts[key] ?? null
        confidence = cost === null ? 'none' : 'high'
        source = cost === null ? '' : 'lista-mega.pdf, gran formato por m2'
        note = cost === null ? 'No se encontró material equivalente claro.' : 'Costo proveedor por m2.'
      }

      rows.push({
        product: product.name,
        variantId: variant.id,
        currentPrice: Number(variant.price || 0),
        options,
        providerCost: cost,
        suggestedPrice: cost === null ? null : sellPrice(cost),
        confidence,
        source,
        note,
      })
    }
  }

  fs.writeFileSync('scratch/pricing-proposal.json', JSON.stringify(rows, null, 2), 'utf8')

  const highOrMedium = rows.filter((row) => row.providerCost !== null)
  const unresolved = rows.filter((row) => row.providerCost === null)
  console.log(JSON.stringify({
    totalRows: rows.length,
    proposed: highOrMedium.length,
    highConfidence: highOrMedium.filter((row) => row.confidence === 'high').length,
    mediumConfidence: highOrMedium.filter((row) => row.confidence === 'medium').length,
    unresolved: unresolved.length,
    proposedByProduct: Object.groupBy(highOrMedium, (row) => row.product),
    unresolvedByProduct: Object.groupBy(unresolved, (row) => row.product),
  }, null, 2))
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
