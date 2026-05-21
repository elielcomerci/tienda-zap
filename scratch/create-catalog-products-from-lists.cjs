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

function price(cost) {
  return Math.round(cost * MARKUP)
}

function total(unitCost, qty) {
  return price(unitCost * qty)
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function makeVariants(optionNames, rows) {
  return rows.map((row) => ({
    price: row.price,
    sku: row.sku,
    stock: 100,
    options: Object.fromEntries(optionNames.map((name) => {
      const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const matchingKey = Object.keys(row.options).find((key) => (
        key === name || key.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalizedName
      ))
      return [name, row.options[matchingKey]]
    })),
  }))
}

function matrixRows({ productSlug, sizes, quantities, costs, optionNames }) {
  const rows = []
  for (const qty of quantities) {
    for (const [size, values] of Object.entries(sizes)) {
      for (const [label, index] of Object.entries(costs.columns)) {
        const cost = values[qty][index]
        rows.push({
          price: costs.unitPrice ? total(cost, Number(qty)) : price(cost),
          sku: `${productSlug}-${slugify(size)}-${slugify(label)}-${qty}`,
          options: optionNames(size, label, qty),
        })
      }
    }
  }
  return rows
}

const quantities5 = ['100', '200', '300', '500', '1000']
const tierQuantities = ['1', '25', '50', '100', '300', '500', '1000']

const products = [
  {
    name: 'Flyer / Volante simple',
    slug: 'flyer-volante-simple',
    description: 'Volantes y flyers para promociones, eventos, lanzamientos y comunicación comercial.',
    category: 'flyers-y-folletos',
    intentions: ['repartir-y-promocionar', 'que-me-vean-en-la-calle'],
    options: ['Tamaño', 'Papel', 'Color', 'Impresión', 'Cantidad'],
    variants: makeVariants(
      ['Tamaño', 'Papel', 'Color', 'Impresión', 'Cantidad'],
      [
        ...matrixRows({
          productSlug: 'flyer-volante-simple',
          quantities: quantities5,
          sizes: {
            '10x10 cm': {
              100: [6496, 9095, 2126, 2867],
              200: [11953, 11953, 3888, 5287],
              300: [17540, 24556, 5701, 7758],
              500: [28259, 39563, 9489, 12945],
              1000: [54700, 76580, 17779, 24308],
            },
            '10x15 cm': {
              100: [8445, 11888, 2768, 3756],
              200: [15539, 21875, 5173, 7065],
              300: [22802, 32099, 7627, 10425],
              500: [36737, 51715, 11819, 16172],
              1000: [71110, 100101, 22107, 30300],
            },
            '15x21 cm': {
              100: [17151, 24232, 5551, 7608],
              200: [31557, 44586, 10951, 15066],
              300: [46307, 65426, 15510, 21339],
              500: [74605, 105408, 24280, 33424],
              1000: [144408, 204031, 48360, 66648],
            },
            A4: {
              100: [32807, 46514, 10901, 15016],
              200: [60365, 85587, 20463, 28236],
              300: [88579, 125589, 28886, 39859],
              500: [142710, 202338, 48060, 66348],
              1000: [276235, 391651, 95921, 132497],
            },
          },
          costs: { columns: { 'Color|Frente': 0, 'Color|Frente y dorso': 1, 'Blanco y Negro|Frente': 2, 'Blanco y Negro|Frente y dorso': 3 } },
          optionNames: (size, label, qty) => {
            const [color, print] = label.split('|')
            return {
              Tamaño: size,
              Papel: 'Ilustración 150g',
              Color: color,
              Impresión: print,
              Cantidad: qty,
            }
          },
        }),
        ...matrixRows({
          productSlug: 'flyer-volante-simple',
          quantities: quantities5,
          sizes: {
            '10x10 cm': {
              100: [5847, 8185, 1914, 2580],
              200: [10758, 10758, 3500, 4759],
              300: [15786, 22101, 5130, 6982],
              500: [25434, 35607, 8540, 11651],
              1000: [49230, 68922, 16001, 21877],
            },
            '10x15 cm': {
              100: [7601, 10700, 2491, 3380],
              200: [13986, 19687, 4655, 6359],
              300: [20522, 28889, 6864, 9382],
              500: [33064, 46543, 10637, 14555],
              1000: [63999, 90091, 19896, 27270],
            },
            '15x21 cm': {
              100: [15436, 21809, 4995, 6847],
              200: [28401, 40128, 9856, 13559],
              300: [41676, 58883, 13959, 19205],
              500: [67144, 94867, 21852, 30082],
              1000: [129967, 183628, 43524, 59984],
            },
            A4: {
              100: [29526, 41863, 9811, 13514],
              200: [54328, 77028, 18417, 25412],
              300: [79721, 113030, 25998, 35873],
              500: [128439, 182104, 43254, 59714],
              1000: [248611, 352486, 86329, 119247],
            },
          },
          costs: { columns: { 'Color|Frente': 0, 'Color|Frente y dorso': 1, 'Blanco y Negro|Frente': 2, 'Blanco y Negro|Frente y dorso': 3 } },
          optionNames: (size, label, qty) => {
            const [color, print] = label.split('|')
            return {
              Tamaño: size,
              Papel: 'Obra / Ilustración 80g',
              Color: color,
              Impresión: print,
              Cantidad: qty,
            }
          },
        }),
      ],
    ),
  },
  {
    name: 'Tarjetas personales estándar',
    slug: 'tarjetas-personales-estandar',
    description: 'Tarjetas comerciales en papel ilustración 300g, ideales para presentación profesional de alto volumen.',
    category: 'tarjetas-personales',
    intentions: ['dar-confianza-y-seriedad', 'para-que-se-acuerden-de-mi'],
    options: ['Medida', 'Terminación', 'Impresión', 'Cantidad'],
    variants: makeVariants(
      ['Medida', 'Terminación', 'Impresión', 'Cantidad'],
      matrixRows({
        productSlug: 'tarjetas-personales-estandar',
        quantities: quantities5,
        sizes: {
          '9x5 cm': {
            100: [5139, 6853, 5701, 7416, 5814, 7529, 5814, 8204],
            200: [7622, 10365, 8522, 11265, 8548, 11291, 8702, 12526],
            300: [10505, 14277, 11460, 15232, 11651, 15423, 11779, 16824],
            500: [24348, 33606, 26432, 35691, 26849, 36108, 27475, 39859],
            1000: [30560, 40295, 31324, 42659, 31797, 43132, 33013, 48401],
          },
        },
        costs: { columns: { 'Sin laminar|Frente': 0, 'Sin laminar|Frente y dorso': 1, 'Laca UV|Frente': 2, 'Laca UV|Frente y dorso': 3, 'Laminado brillo|Frente': 4, 'Laminado brillo|Frente y dorso': 5, 'Laminado mate|Frente': 6, 'Laminado mate|Frente y dorso': 7 } },
        optionNames: (size, label, qty) => {
          const [finish, print] = label.split('|')
          return { Medida: size, Terminación: finish, Impresión: print, Cantidad: qty }
        },
      }),
    ),
  },
  {
    name: 'Tarjetas postales',
    slug: 'tarjetas-postales',
    description: 'Postales comerciales para invitaciones, promociones, saludos corporativos y material de marca.',
    category: 'tarjetas-y-papeleria',
    intentions: ['dar-confianza-y-seriedad', 'para-que-se-acuerden-de-mi', 'repartir-y-promocionar'],
    options: ['Terminación', 'Impresión', 'Cantidad'],
    variants: makeVariants(
      ['Terminación', 'Impresión', 'Cantidad'],
      matrixRows({
        productSlug: 'tarjetas-postales',
        quantities: quantities5,
        sizes: { Postal: {
          100: [10932, 15047, 12283, 15047, 12554, 15047, 12554, 18290],
          200: [20037, 27924, 22627, 27924, 22701, 27924, 23144, 34138],
          300: [27979, 38989, 30931, 38989, 31522, 38989, 31916, 46864],
          500: [43201, 60270, 47524, 60270, 48389, 60270, 49686, 73239],
          1000: [80453, 110857, 86418, 110857, 87931, 110857, 91822, 136795],
        } },
        costs: { columns: { 'Sin laminar|Frente': 0, 'Sin laminar|Frente y dorso': 1, 'Laca UV|Frente': 2, 'Laca UV|Frente y dorso': 3, 'Laminado brillo|Frente': 4, 'Laminado brillo|Frente y dorso': 5, 'Laminado mate|Frente': 6, 'Laminado mate|Frente y dorso': 7 } },
        optionNames: (_size, label, qty) => {
          const [finish, print] = label.split('|')
          return { Terminación: finish, Impresión: print, Cantidad: qty }
        },
      }),
    ),
  },
  {
    name: 'Pósters por medida',
    slug: 'posters-por-medida',
    description: 'Pósters impresos por medida para locales, eventos, vidrieras, campañas y decoración comercial.',
    category: 'carteleria',
    intentions: ['que-me-vean-en-la-calle', 'repartir-y-promocionar'],
    options: ['Medida', 'Papel', 'Impresión', 'Cantidad'],
    variants: makeVariants(
      ['Medida', 'Papel', 'Impresión', 'Cantidad'],
      matrixRows({
        productSlug: 'posters-por-medida',
        quantities: tierQuantities,
        sizes: {
          A4: {
            1: [587, 808, 587, 807, 556, 776, 505, 726],
            25: [481, 661, 480, 661, 455, 635, 414, 594],
            50: [454, 624, 453, 624, 429, 600, 391, 561],
            100: [427, 588, 427, 587, 404, 564, 368, 528],
            300: [429, 551, 400, 551, 379, 529, 345, 495],
            500: [374, 514, 373, 514, 354, 494, 322, 462],
            1000: [347, 477, 347, 477, 328, 459, 299, 429],
          },
        },
        costs: { unitPrice: true, columns: { '150g|Frente': 0, '150g|Frente y dorso': 1, '115g|Frente': 2, '115g|Frente y dorso': 3, '90g|Frente': 4, '90g|Frente y dorso': 5, '80g|Frente': 6, '80g|Frente y dorso': 7 } },
        optionNames: (size, label, qty) => {
          const [paper, print] = label.split('|')
          return { Medida: size, Papel: paper, Impresión: print, Cantidad: qty }
        },
      }),
    ),
  },
  {
    name: 'Sobres personalizados',
    slug: 'sobres-personalizados',
    description: 'Sobres impresos para papelería institucional, envíos comerciales y presentación corporativa.',
    category: 'tarjetas-y-papeleria',
    intentions: ['dar-confianza-y-seriedad'],
    options: ['Medida', 'Tipo', 'Cantidad'],
    variants: makeVariants(
      ['Medida', 'Tipo', 'Cantidad'],
      matrixRows({
        productSlug: 'sobres-personalizados',
        quantities: quantities5,
        sizes: {
          '22,9 x 32,4 cm|Sobre bolsa A4': { 100: [633], 200: [586], 300: [554], 500: [523], 1000: [491] },
          '27 x 37 cm|Sobre bolsa': { 100: [715], 200: [655], 300: [615], 500: [576], 1000: [536] },
          '25 x 35,3 cm|Sobre bolsa': { 100: [673], 200: [620], 300: [584], 500: [549], 1000: [513] },
          '12 x 23,5 cm|Oficio inglés': { 100: [440], 200: [422], 300: [410], 500: [397], 1000: [385] },
        },
        costs: { unitPrice: true, columns: { '4/0': 0 } },
        optionNames: (sizeKey, _label, qty) => {
          const [size, type] = sizeKey.split('|')
          return { Medida: size, Tipo: type, Cantidad: qty }
        },
      }),
    ),
  },
  {
    name: 'Plancha de imán impreso',
    slug: 'plancha-de-iman-impreso',
    description: 'Planchas de imán impresas para promos, delivery, merchandising y material recordatorio.',
    category: 'imanes',
    intentions: ['para-que-se-acuerden-de-mi'],
    options: ['Medida', 'Cantidad'],
    variants: makeVariants(
      ['Medida', 'Cantidad'],
      ['1', '25', '50', '100', '300', '500'].map((qty, index) => {
        const costs = [2953, 2442, 2314, 2186, 2059, 1931]
        return {
          price: total(costs[index], Number(qty)),
          sku: `plancha-de-iman-impreso-30x46-${qty}`,
          options: { Medida: '30x46 cm', Cantidad: qty },
        }
      }),
    ),
  },
  {
    name: 'Vinilo para vidriera',
    slug: 'vinilo-para-vidriera',
    description: 'Vinilos impresos para vidrieras, promociones, locales, horarios, gráfica comercial y decoración.',
    category: 'carteleria',
    intentions: ['que-me-vean-en-la-calle'],
    options: ['Material', 'Calidad'],
    variants: makeVariants(
      ['Material', 'Calidad'],
      [
        ['Promo brillo o mate', 'Normal', 10300],
        ['Promo brillo o mate', 'Alta', 12350],
        ['1ra marca brillo o mate', 'Normal', 12850],
        ['1ra marca brillo o mate', 'Alta', 15400],
        ['Base gris / negra', 'Normal', 14100],
        ['Base gris / negra', 'Alta', 19750],
        ['Backlight', 'Normal', 16500],
        ['Backlight', 'Alta', 15250],
        ['Transparente clear', 'Normal', 12750],
        ['Transparente clear', 'Alta', 20650],
        ['Microperforado', 'Normal', 17200],
        ['Microperforado', 'Alta', 30800],
      ].map(([material, quality, cost]) => ({
        price: price(cost),
        sku: `vinilo-vidriera-${slugify(material)}-${slugify(quality)}`,
        options: { Material: material, Calidad: quality },
      })),
    ),
  },
  {
    name: 'Cartel rígido para local',
    slug: 'cartel-rigido-para-local',
    description: 'Carteles rígidos impresos en cama plana para frentes, locales, señalización y comunicación visual.',
    category: 'carteleria',
    intentions: ['que-me-vean-en-la-calle', 'dar-confianza-y-seriedad'],
    options: ['Material', 'Calidad'],
    variants: makeVariants(
      ['Material', 'Calidad'],
      [
        ['PVC 3 mm', 'Normal', 26400],
        ['PVC 3 mm', 'Alta', 31350],
        ['P.A.I. 1 mm', 'Normal', 26400],
        ['P.A.I. 1 mm', 'Alta', 31350],
        ['Corrugado plástico 2,02 mm', 'Normal', 11550],
        ['Corrugado plástico 2,02 mm', 'Alta', 14050],
        ['PVC 3 mm - Placa entera', 'Imprenta sin cortar', 51700],
        ['P.A.I. 1 mm - Placa entera', 'Imprenta sin cortar', 51700],
        ['Corrugado plástico - Placa entera', 'Imprenta sin cortar', 20350],
      ].map(([material, quality, cost]) => ({
        price: price(cost),
        sku: `cartel-rigido-${slugify(material)}-${slugify(quality)}`,
        options: { Material: material, Calidad: quality },
      })),
    ),
  },
  {
    name: 'Roll up y portabanner',
    slug: 'roll-up-y-portabanner',
    description: 'Banners con estructura para ferias, locales, eventos, stands y presentaciones comerciales.',
    category: 'banners',
    intentions: ['que-me-vean-en-la-calle'],
    options: ['Formato', 'Material'],
    variants: makeVariants(
      ['Formato', 'Material'],
      [
        ['Spider PVC 80x180', 'Frontlight', 35550],
        ['Spider PVC 80x180', 'Blackout', 43000],
        ['1 tensor 90x190', 'Frontlight', 42250],
        ['1 tensor 90x190', 'Blackout', 51150],
        ['2 tensores 90x190', 'Frontlight', 38750],
        ['2 tensores 90x190', 'Blackout', 46900],
        ['Roll-up 85x200', 'Frontlight', 80100],
        ['Roll-up 85x200', 'Blackout', 96900],
        ['Portabanner 150x200', 'Frontlight', 97900],
        ['Portabanner 150x200', 'Blackout', 118500],
        ['Portabanner 200x200', 'Frontlight', 136400],
        ['Portabanner 200x200', 'Blackout', 165050],
        ['Portabanner 300x200', 'Frontlight', 211200],
        ['Portabanner 300x200', 'Blackout', 255600],
      ].map(([format, material, cost]) => ({
        price: price(cost),
        sku: `roll-up-portabanner-${slugify(format)}-${slugify(material)}`,
        options: { Formato: format, Material: material },
      })),
    ),
  },
  {
    name: 'Señalética interior',
    slug: 'senaletica-interior',
    description: 'Señalética rígida para orientación, normas, horarios, direccionales y comunicación interna.',
    category: 'senaletica',
    intentions: ['dar-confianza-y-seriedad', 'que-me-vean-en-la-calle'],
    options: ['Material', 'Calidad'],
    variants: makeVariants(
      ['Material', 'Calidad'],
      [
        ['PVC 3 mm', 'Normal', 26400],
        ['PVC 3 mm', 'Alta', 31350],
        ['P.A.I. 1 mm', 'Normal', 26400],
        ['P.A.I. 1 mm', 'Alta', 31350],
        ['Corrugado plástico 2,02 mm', 'Normal', 11550],
        ['Corrugado plástico 2,02 mm', 'Alta', 14050],
      ].map(([material, quality, cost]) => ({
        price: price(cost),
        sku: `senaletica-interior-${slugify(material)}-${slugify(quality)}`,
        options: { Material: material, Calidad: quality },
      })),
    ),
  },
  {
    name: 'Cuadernos personalizados',
    slug: 'cuadernos-personalizados',
    description: 'Cuadernos personalizados con tapa full color para regalos corporativos, eventos y merchandising.',
    category: 'senaladores-y-libreria',
    intentions: ['para-que-se-acuerden-de-mi'],
    options: ['Formato', 'Tamaño'],
    variants: makeVariants(
      ['Formato', 'Tamaño'],
      [
        ['Escolar 24 páginas', 'A5', 950],
        ['Escolar 24 páginas', 'A4', 1350],
        ['Escolar 48 páginas', 'A5', 1800],
        ['Escolar 48 páginas', 'A4', 2650],
        ['Universitario 100 páginas', 'A5', 2300],
        ['Universitario 100 páginas', 'A4', 2900],
        ['Universitario 160 páginas', 'A5', 3400],
        ['Universitario 160 páginas', 'A4', 3900],
      ].map(([format, size, cost]) => ({
        price: price(cost),
        sku: `cuadernos-personalizados-${slugify(format)}-${slugify(size)}`,
        options: { Formato: format, Tamaño: size },
      })),
    ),
  },
]

const categoryBusinessTypes = {
  'tarjetas-y-papeleria': ['belleza-y-salud', 'gastronomia', 'inmobiliarias', 'moda-y-showrooms', 'retail-y-comercios', 'eventos-y-btl'],
  senaletica: ['belleza-y-salud', 'eventos-y-btl', 'gastronomia', 'gym-y-yoga', 'inmobiliarias', 'retail-y-comercios'],
  'senaladores-y-libreria': ['eventos-y-btl', 'retail-y-comercios'],
}

async function ensureCategoryLinks() {
  for (const [categorySlug, businessSlugs] of Object.entries(categoryBusinessTypes)) {
    await prisma.category.update({
      where: { slug: categorySlug },
      data: {
        businessTypes: {
          connect: businessSlugs.map((slug) => ({ slug })),
        },
      },
    })
  }
}

async function createProduct(definition) {
  const existing = await prisma.product.findUnique({ where: { slug: definition.slug } })
  if (existing) {
    return { slug: definition.slug, action: 'skipped' }
  }

  const category = await prisma.category.findUniqueOrThrow({ where: { slug: definition.category } })
  const product = await prisma.product.create({
    data: {
      name: definition.name,
      slug: definition.slug,
      description: definition.description,
      price: 0,
      images: [],
      categoryId: category.id,
      active: true,
      stock: 100,
      creditDownPaymentPercent: 30,
      intentions: {
        connect: definition.intentions.map((slug) => ({ slug })),
      },
    },
  })

  const valuesByOption = new Map()
  for (const optionName of definition.options) {
    const option = await prisma.productOption.create({
      data: { productId: product.id, name: optionName, isRequired: true },
    })
    const values = [...new Set(definition.variants.map((variant) => variant.options[optionName]))]
    const map = new Map()
    for (const value of values) {
      const optionValue = await prisma.productOptionValue.create({
        data: { optionId: option.id, value },
      })
      map.set(value, optionValue.id)
    }
    valuesByOption.set(optionName, map)
  }

  for (const variant of definition.variants) {
    const created = await prisma.productVariant.create({
      data: {
        productId: product.id,
        price: variant.price,
        sku: variant.sku,
        stock: variant.stock ?? 100,
      },
    })
    for (const optionName of definition.options) {
      await prisma.variantOption.create({
        data: {
          variantId: created.id,
          optionValueId: valuesByOption.get(optionName).get(variant.options[optionName]),
        },
      })
    }
  }

  return { slug: definition.slug, action: 'created', variants: definition.variants.length }
}

async function main() {
  await ensureCategoryLinks()

  const results = []
  for (const product of products) {
    results.push(await createProduct(product))
  }

  console.log(JSON.stringify({ markup: MARKUP, results }, null, 2))
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
