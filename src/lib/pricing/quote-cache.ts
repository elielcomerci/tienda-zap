import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { ProductQuoteResult } from './product-quoter'

export const PRODUCT_QUOTE_CACHE_ENGINE_VERSION = '1'

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)

  if (Array.isArray(value)) {
    return '[' + value.map(stableSerialize).join(',') + ']'
  }

  const record = value as Record<string, unknown>
  return '{' + Object.keys(record).sort().map((key) => {
    const serialized = stableSerialize(record[key])
    return serialized === undefined ? '' : JSON.stringify(key) + ':' + serialized
  }).filter(Boolean).join(',') + '}'
}

export function createPricingFingerprint(input: unknown): string {
  return createHash('sha256').update(stableSerialize(input)).digest('hex')
}

export function createQuoteCacheKey(input: unknown): string {
  return createHash('sha256').update(stableSerialize(input)).digest('hex')
}

export type CachedProductQuote = ProductQuoteResult & {
  cacheHit: boolean
  pricingFingerprint: string
}

export async function getOrCreateCachedProductQuote({
  cacheKeyInput,
  pricingFingerprintInput,
  sourceType,
  engineVersion = PRODUCT_QUOTE_CACHE_ENGINE_VERSION,
  calculate,
}: {
  cacheKeyInput: unknown
  pricingFingerprintInput: unknown
  sourceType: string
  engineVersion?: string
  calculate: () => ProductQuoteResult
}): Promise<CachedProductQuote> {
  const cacheKey = createQuoteCacheKey(cacheKeyInput)
  const pricingFingerprint = createPricingFingerprint({ engineVersion, sourceType, pricing: pricingFingerprintInput })

  const cached = await prisma.productQuoteCache.findUnique({
    where: {
      cacheKey_pricingFingerprint: {
        cacheKey,
        pricingFingerprint,
      },
    },
  })

  if (cached) {
    return {
      unitPrice: cached.unitPrice,
      totalPrice: cached.totalPrice,
      totalCost: cached.totalCost,
      selectedOptions: Array.isArray(cached.selectedOptions) ? cached.selectedOptions as Array<{ name: string; value: string }> : [],
      breakdown: {
        materialCost: cached.materialCost ?? 0,
        printingCost: cached.printingCost ?? 0,
        processCost: cached.processCost ?? 0,
        finishingCost: cached.finishingCost ?? 0,
        wasteCost: cached.wasteCost ?? 0,
        productionCost: cached.productionCost ?? cached.totalCost,
        marginAmount: cached.marginAmount ?? cached.totalPrice - cached.totalCost,
        marginPercent: cached.marginPercent ?? 0,
      },
      cacheHit: true,
      pricingFingerprint,
    }
  }

  const result = calculate()
  const breakdown = result.breakdown

  await prisma.productQuoteCache.upsert({
    where: {
      cacheKey_pricingFingerprint: {
        cacheKey,
        pricingFingerprint,
      },
    },
    update: {
      unitPrice: result.unitPrice,
      totalPrice: result.totalPrice,
      totalCost: result.totalCost,
      materialCost: breakdown?.materialCost ?? null,
      printingCost: breakdown?.printingCost ?? null,
      processCost: breakdown?.processCost ?? null,
      finishingCost: breakdown?.finishingCost ?? null,
      wasteCost: breakdown?.wasteCost ?? null,
      productionCost: breakdown?.productionCost ?? result.totalCost,
      marginPercent: breakdown?.marginPercent ?? null,
      marginAmount: breakdown?.marginAmount ?? null,
      sourceType,
      engineVersion,
      selectedOptions: result.selectedOptions,
    },
    create: {
      cacheKey,
      pricingFingerprint,
      engineVersion,
      sourceType,
      status: 'CALCULATED',
      unitPrice: result.unitPrice,
      totalPrice: result.totalPrice,
      totalCost: result.totalCost,
      materialCost: breakdown?.materialCost ?? null,
      printingCost: breakdown?.printingCost ?? null,
      processCost: breakdown?.processCost ?? null,
      finishingCost: breakdown?.finishingCost ?? null,
      wasteCost: breakdown?.wasteCost ?? null,
      productionCost: breakdown?.productionCost ?? result.totalCost,
      marginPercent: breakdown?.marginPercent ?? null,
      marginAmount: breakdown?.marginAmount ?? null,
      currency: 'ARS',
      taxIncluded: false,
      selectedOptions: result.selectedOptions,
    },
  })

  return { ...result, cacheHit: false, pricingFingerprint }
}

function pickTierSnapshot(tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>) {
  return tiers.map(({ minQty, maxQty, unitPrice }) => ({ minQty, maxQty, unitPrice }))
}

export function buildProductQuotePricingFingerprintInput(config: any, selection: unknown) {
  return {
    config: {
      id: config.id,
      pricingMode: config.pricingMode,
      itemWidth: config.itemWidth,
      itemHeight: config.itemHeight,
      margin: config.margin,
      bleed: config.bleed,
      profitMargin: config.profitMargin,
      allowCustomSize: config.allowCustomSize,
      minWidth: config.minWidth,
      maxWidth: config.maxWidth,
      minHeight: config.minHeight,
      maxHeight: config.maxHeight,
      rawMaterial: config.rawMaterial
        ? {
            id: config.rawMaterial.id,
            width: config.rawMaterial.width,
            height: config.rawMaterial.height,
            unit: config.rawMaterial.unit,
            tiers: pickTierSnapshot(config.rawMaterial.tiers ?? []),
          }
        : null,
      allowedMaterials: (config.allowedMaterials ?? []).map((entry: any) => ({
        rawMaterialId: entry.rawMaterialId,
        rawMaterial: entry.rawMaterial
          ? {
              id: entry.rawMaterial.id,
              width: entry.rawMaterial.width,
              height: entry.rawMaterial.height,
              unit: entry.rawMaterial.unit,
              tiers: pickTierSnapshot(entry.rawMaterial.tiers ?? []),
            }
          : null,
      })),
      finishings: (config.finishings ?? []).map((entry: any) => ({
        finishingId: entry.finishingId,
        finishing: entry.finishing
          ? {
              id: entry.finishing.id,
              costType: entry.finishing.costType,
              tiers: pickTierSnapshot(entry.finishing.tiers ?? []),
            }
          : null,
      })),
    },
    selection,
  }
}
