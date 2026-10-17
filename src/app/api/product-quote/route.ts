import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProductQuote } from '@/lib/pricing/product-quoter'
import { quoteConfiguratorSelection } from '@/lib/pricing/configurator-adapter'
import { calculateCommercialPrice } from '@/lib/pricing/commercial-pricing-policy'
import { getOrCreateCachedProductQuote, buildProductQuotePricingFingerprintInput } from '@/lib/pricing/quote-cache'
import { impresosPackagingConfigurators } from '../../../../prisma/seed/data/06-configurators/impresos-packaging'
import { presenciaFisicaConfigurators } from '../../../../prisma/seed/data/06-configurators/presencia-fisica'

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
      ? [...impresosPackagingConfigurators, ...presenciaFisicaConfigurators]
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

    const pricing = configurator?.pricing as any
    const requestedProcess = (() => {
      if (selection.productionProcess) return String(selection.productionProcess)
      // Flyers resolve offset from the exact finished-product matrix cell; keep
      // the public-price policy aligned with the same resolver used for costing.
      if (
        pricing?.providerFinishedCostMatrix?.resolver?.type === 'FLYERS_DIGITAL' &&
        selection.foldingType === 'plano' &&
        selection.printing === '4_4'
      ) {
        const offsetCost =
          pricing.providerFinishedCostMatrix.matrix?.[selection.material || '']?.[selection.format || '']?.[String(selection.quantity)]
        if (offsetCost !== undefined) return 'offset'
      }
      return 'digital'
    })()
    const commercialPolicy =
      pricing?.commercialPricingPoliciesByProcessAndMaterialAndPrinting?.[requestedProcess]?.[selection.material || '']?.[selection.printing || ''] ||
      pricing?.commercialPricingPoliciesByProcessAndMaterialAndQuantity?.[requestedProcess]?.[selection.material || '']?.[String(selection.quantity)] ||
      pricing?.commercialPricingPoliciesByProcessAndMaterial?.[requestedProcess]?.[selection.material || ''] ||
      pricing?.commercialPricingPoliciesByProcess?.[requestedProcess] ||
      pricing?.commercialPricingPoliciesByMaterial?.[selection.material || ''] ||
      pricing?.commercialPricingPolicy

    // If this configurator declares process-specific policies, never silently
    // fall back to the legacy ProductQuoterConfig margin for a missing policy.
    if (
      pricing?.engine === 'PROVIDER_FINISHED_COST' &&
      pricing?.commercialPricingPoliciesByProcess &&
      !commercialPolicy
    ) {
      throw new Error('CONSULT_REQUIRED: Falta una política comercial para el proceso seleccionado.')
    }

    const quote = await getOrCreateCachedProductQuote({
      cacheKeyInput: { productId, selection },
      pricingFingerprintInput: configurator
        ? { configurator: { id: configurator.id, schemaVersion: configurator.schemaVersion, schema: configurator.schema, compatibility: configurator.compatibility, pricing: configurator.pricing }, quoterConfig: config ? buildProductQuotePricingFingerprintInput(config, selection) : null, selection }
        : buildProductQuotePricingFingerprintInput(config, selection),
      sourceType: configurator ? 'CONFIGURATOR_VERSION' : 'PRODUCT_QUOTER',
      calculate: () => configurator ? quoteConfiguratorSelection(configurator as any, selection, config as any) : calculateProductQuote(config as any, selection),
    })

    // The quote cache stores the cost and price, but older cache records do not
    // persist the tax breakdown. Rebuild the public price from the current
    // versioned policy on every response so total, net and VAT always agree.
    const responseQuote = pricing?.engine === 'PROVIDER_FINISHED_COST' && commercialPolicy
      ? (() => {
          const calculated = calculateCommercialPrice(Number(quote.totalCost), commercialPolicy)
          const quantity = Number(selection.quantity)
          return {
            ...quote,
            unitPrice: calculated.finalPrice / quantity,
            totalPrice: calculated.finalPrice,
            taxTreatment: 'INCLUDED' as const,
            netPrice: calculated.netPrice,
            vatAmount: calculated.vatAmount,
            vatRatePercent: commercialPolicy.vatRatePercent,
            breakdown: quote.breakdown
              ? {
                  ...quote.breakdown,
                  marginAmount: calculated.grossProfit,
                  marginPercent: calculated.grossMarginPercent,
                }
              : quote.breakdown,
          }
        })()
      : quote

    return NextResponse.json(responseQuote, {
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
