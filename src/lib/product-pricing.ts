import { calculateProductQuote, getQuoterMaterials } from '@/lib/pricing/product-quoter'

type PriceLike = {
  price: number
}

export function isPurchasablePrice(price: number | null | undefined): price is number {
  return typeof price === 'number' && price > 0
}

export function getLowestPurchasablePrice(items: PriceLike[] | null | undefined): number | null {
  if (!items || items.length === 0) {
    return null
  }

  const prices = items
    .map((item) => item.price)
    .filter(isPurchasablePrice)

  if (prices.length === 0) {
    return null
  }

  return Math.min(...prices)
}

export function getProductDisplayPrice(product: {
  price: number
  variants?: PriceLike[] | null
  quoterConfig?: any
}): number | null {
  if (product.variants && product.variants.length > 0) {
    return getLowestPurchasablePrice(product.variants)
  }

  if (product.quoterConfig) {
    return getLowestQuoterPrice(product.quoterConfig)
  }

  return isPurchasablePrice(product.price) ? product.price : null
}

function getLowestQuoterPrice(quoterConfig: any): number | null {
  const materials = getQuoterMaterials(quoterConfig)
  const quantities = quoterConfig.quantityPresets || []
  const sizes = quoterConfig.sizePresets?.length ? quoterConfig.sizePresets : [null]
  const prices: number[] = []

  for (const material of materials) {
    for (const quantityPreset of quantities) {
      for (const size of sizes) {
        try {
          const quote = calculateProductQuote(quoterConfig, {
            rawMaterialId: material.id,
            quantity: quantityPreset.quantity,
            sizeLabel: size?.label,
            finishingIds: [],
          })
          if (isPurchasablePrice(quote.totalPrice)) {
            prices.push(quote.totalPrice)
          }
        } catch {
          // Ignore invalid preset combinations; other presets may still be purchasable.
        }
      }
    }
  }

  return prices.length > 0 ? Math.min(...prices) : null
}
