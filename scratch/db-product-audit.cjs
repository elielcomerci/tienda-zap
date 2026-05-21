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
  const categories = await prisma.category.findMany({
    include: {
      products: {
        include: {
          options: { include: { values: true } },
          variants: {
            include: {
              options: {
                include: {
                  optionValue: { include: { option: true } },
                },
              },
            },
          },
          outgoingRelations: {
            include: {
              relatedProduct: {
                select: {
                  name: true,
                  slug: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
          intentions: { select: { name: true } },
          targetBusinessTypes: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  const businessTypes = await prisma.businessType.findMany({
    include: { categories: { select: { name: true, slug: true } } },
    orderBy: { name: 'asc' },
  })

  const intentions = await prisma.intention.findMany({
    include: {
      products: {
        select: {
          name: true,
          slug: true,
          isCombo: true,
          category: { select: { name: true } },
        },
      },
    },
    orderBy: { order: 'asc' },
  })

  const products = categories.flatMap((category) =>
    category.products.map((product) => {
      const variantPrices = product.variants.map((variant) => Number(variant.price || 0))
      return {
        name: product.name,
        slug: product.slug,
        category: category.name,
        active: product.active,
        hidden: false,
        isService: category.isService,
        isCombo: product.isCombo,
        comboPricingMode: product.comboPricingMode,
        comboDiscountPercent: product.comboDiscountPercent,
        price: Number(product.price || 0),
        options: product.options.map((option) => ({
          name: option.name,
          values: option.values.map((value) => value.value),
        })),
        variantCount: product.variants.length,
        pricedVariantCount: variantPrices.filter((price) => price > 0).length,
        zeroVariantCount: variantPrices.filter((price) => price <= 0).length,
        minVariantPrice: variantPrices.length ? Math.min(...variantPrices) : null,
        maxVariantPrice: variantPrices.length ? Math.max(...variantPrices) : null,
        relatedProducts: product.outgoingRelations.map((relation) => ({
          name: relation.relatedProduct.name,
          category: relation.relatedProduct.category?.name || null,
        })),
        intentions: product.intentions.map((intention) => intention.name),
        targetBusinessTypes: product.targetBusinessTypes.map((type) => type.name),
      }
    })
  )

  const summary = {
    totals: {
      categories: categories.length,
      products: products.length,
      activeProducts: products.filter((product) => product.active && !product.hidden).length,
      inactiveProducts: products.filter((product) => !product.active).length,
      hiddenProducts: products.filter((product) => product.hidden).length,
      serviceProducts: products.filter((product) => product.isService).length,
      combos: products.filter((product) => product.isCombo).length,
      productsWithOptions: products.filter((product) => product.options.length > 0).length,
      productsWithVariants: products.filter((product) => product.variantCount > 0).length,
    },
    categories: categories.map((category) => ({
      name: category.name,
      slug: category.slug,
      productCount: category.products.length,
      isService: category.isService,
      activeCount: category.products.filter((product) => product.active).length,
      inactiveCount: category.products.filter((product) => !product.active).length,
      hiddenCount: 0,
      products: category.products.map((product) => product.name),
    })),
    products: products.map((product) => ({
      name: product.name,
      slug: product.slug,
      category: product.category,
      active: product.active,
      isService: product.isService,
      isCombo: product.isCombo,
      price: product.price,
      options: product.options.map((option) => `${option.name}: ${option.values.join(', ')}`),
      variantCount: product.variantCount,
      pricedVariantCount: product.pricedVariantCount,
      zeroVariantCount: product.zeroVariantCount,
      minVariantPrice: product.minVariantPrice,
      maxVariantPrice: product.maxVariantPrice,
      intentions: product.intentions,
      targetBusinessTypes: product.targetBusinessTypes,
    })),
    productsNeedingPricingReview: products.filter(
      (product) =>
        product.price <= 0 ||
        (product.variantCount > 0 && product.zeroVariantCount > 0) ||
        (product.options.length > 0 && product.variantCount === 0)
    ),
    businessTypes: businessTypes.map((type) => ({
      name: type.name,
      slug: type.slug,
      categoryCount: type.categories.length,
      categories: type.categories.map((category) => category.name),
    })),
    intentions: intentions.map((intention) => ({
      name: intention.name,
      productCount: intention.products.length,
      products: intention.products.map((product) => product.name),
    })),
  }

  console.log(JSON.stringify(summary, null, 2))
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
