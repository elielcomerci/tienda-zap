import type { CryptoAssetSymbol } from './networks'

const CRYPTOYA_BASE_URL = 'https://criptoya.com/api'
const MAX_QUOTE_AGE_SECONDS = 180

type CriptoYaQuote = {
  totalBid?: unknown
  time?: unknown
}

export type CryptoYaPrice = {
  priceArs: string
  observedAt: Date
  exchangeCount: number
  source: 'criptoya-median-totalBid'
}

/**
 * Uses the median of fresh totalBid quotes as a conservative ARS reference.
 * CriptoYa's totalBid includes reported trade/transfer fees, but this is still
 * a market reference, not a guaranteed execution or liquidation price.
 */
export async function getCriptoYaSellReferencePrice(
  symbol: CryptoAssetSymbol
): Promise<CryptoYaPrice> {
  const response = await fetch(`${CRYPTOYA_BASE_URL}/${symbol}/ARS/1`, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  })

  if (!response.ok) {
    throw new Error(`CriptoYa respondió HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Respuesta inválida de CriptoYa')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const quotes: Array<{ price: number; time: number }> = []

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const quote = value as CriptoYaQuote
    const price = Number(quote.totalBid)
    const time = Number(quote.time)

    if (!Number.isFinite(price) || price <= 0) continue
    if (!Number.isInteger(time) || time <= 0) continue
    if (time > nowSeconds + 30 || nowSeconds - time > MAX_QUOTE_AGE_SECONDS) continue

    quotes.push({ price, time })
  }

  if (quotes.length < 2) {
    throw new Error('CriptoYa no devolvió al menos dos cotizaciones recientes para calcular una referencia confiable')
  }

  quotes.sort((a, b) => a.price - b.price)
  const middle = Math.floor(quotes.length / 2)
  const median = quotes.length % 2
    ? quotes[middle].price
    : (quotes[middle - 1].price + quotes[middle].price) / 2

  if (!Number.isFinite(median) || median <= 0) {
    throw new Error('No se pudo calcular una cotización válida')
  }

  // Store the rate at a stable precision before converting to token units.
  const priceArs = median.toFixed(8)
  const oldestIncludedTimestamp = Math.min(...quotes.map((quote) => quote.time))

  return {
    priceArs,
    observedAt: new Date(oldestIncludedTimestamp * 1000),
    exchangeCount: quotes.length,
    source: 'criptoya-median-totalBid',
  }
}

export function arsToCents(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El importe ARS debe ser mayor que cero')
  }

  return BigInt(Math.round(amount * 100))
}

/** Calculates token base units using integer arithmetic and rounds up. */
export function calculateTokenAmountUnits(
  arsAmountCents: bigint,
  priceArs: string,
  decimals: number
): bigint {
  if (arsAmountCents <= 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Parámetros de cotización inválidos')
  }

  const priceScaled = BigInt(Math.round(Number(priceArs) * 100_000_000))
  if (priceScaled <= 0n) throw new Error('Cotización inválida')

  const numerator = arsAmountCents * 1_000_000n * (10n ** BigInt(decimals))
  return (numerator + priceScaled - 1n) / priceScaled
}

export function formatTokenUnits(units: bigint, decimals: number): string {
  if (units < 0n || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Cantidad de token inválida')
  }

  if (decimals === 0) return units.toString()

  const digits = units.toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, -decimals)
  const fraction = digits.slice(-decimals).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}
