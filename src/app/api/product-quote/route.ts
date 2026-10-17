import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProductQuote } from '@/lib/pricing/product-quoter'
import { quoteConfiguratorSelection } from '@/lib/pricing/configurator-adapter'
import { getOrCreateCachedProductQuote, buildProductQuotePricingFingerprintInput } from '@/lib/pricing/quote-cache'
import { impresosPackagingConfigurators } from '../../../../prisma/seed/data/06-configurators/impresos-packaging'

const quoterConfigInclude = {
  rawMaterial: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } },
  allowedMaterials: {
    include: {
      rawMaterial: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } },
    },
  },
  finishings: {
    include: {
      finishing: { include: { tiers: { orderBy: { minQty: 'asc' as const } } } },
    },
  },
  quantityPresets: { orderBy: { sortOrder: 'asc' as const } },
  sizePresets: { orderBy: { sortOrder: 'asc' as const } },
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const productId = typeof body?.productId === 'string' ? body.productId : ''
    const selection = body?.selection

    if (!productId || !selection || typeof selection !== 'object') {
      return NextResponse.json({ error: 'Falta el producto o la configuración.' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId, active: true },
      select: { slug: true, quoterConfig: { include: quoterConfigInclude }, configuratorVersions: { where: { status: 'ACTIVE' }, orderBy: { schemaVersion: 'desc' }, take: 1 } },
    })

    const config = product?.quoterConfig
    const databaseConfigurator = product?.configuratorVersions?.[0]
    const seedConfigurator = product
      ? impresosPackagingConfigurators
          .filter((item) => item.productSlug === product.slug && item.status === 'ACTIVE')
          .sort((a, b) => b.schemaVersion.localeCompare(a.schemaVersion, undefined, { numeric: true }))[0]
      : undefined
    const seedIsNewer = Boolean(seedConfigurator) && (
      !databaseConfigurator ||
      seedConfigurator!.schemaVersion.localeCompare(databaseConfigurator.schemaVersion, undefined, { numeric: true }) > 0
    )
    const configurator = seedIsNewer
      ? { ...seedConfigurator!, id: `seed:${product!.slug}:${seedConfigurator!.schemaVersion}` }
      : databaseConfigurator
    if (!config && !configurator) {
      return NextResponse.json({ error: 'Este producto no tiene un cotizador activo.' }, { status: 404 })
    }

    const quote = await getOrCreateCachedProductQuote({
      cacheKeyInput: { productId, selection },
      pricingFingerprintInput: configurator
        ? { configurator: { id: configurator.id, schemaVersion: configurator.schemaVersion, schema: configurator.schema, compatibility: configurator.compatibility, pricing: configurator.pricing }, quoterConfig: config ? buildProductQuotePricingFingerprintInput(config, selection) : null, selection }
        : buildProductQuotePricingFingerprintInput(config, selection),
      sourceType: configurator ? 'CONFIGURATOR_VERSION' : 'PRODUCT_QUOTER',
      calculate: () => configurator ? quoteConfiguratorSelection(configurator as any, selection, config as any) : calculateProductQuote(config as any, selection),
    })

    return NextResponse.json(quote, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No pudimos calcular esta configuración.'
    const consultationRequired = message.startsWith('CONSULT_REQUIRED:') || message.startsWith('No hay costo real cargado')

    return NextResponse.json(
      { error: consultationRequired ? 'CONSULT_REQUIRED' : message },
      { status: consultationRequired ? 422 : 400 }
    )
  }
}
