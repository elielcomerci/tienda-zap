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
}): number | null {
  if (product.variants && product.variants.length > 0) {
    return getLowestPurchasablePrice(product.variants)
  }

  return isPurchasablePrice(product.price) ? product.price : null
}
