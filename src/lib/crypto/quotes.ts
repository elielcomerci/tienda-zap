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
  if (arsAmountCents <= BigInt(0) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Parámetros de cotización inválidos')
  }

  const priceScaled = BigInt(Math.round(Number(priceArs) * 100_000_000))
  if (priceScaled <= BigInt(0)) throw new Error('Cotización inválida')

  const numerator = arsAmountCents * BigInt(1000000) * (BigInt(10) ** BigInt(decimals))
  return (numerator + priceScaled - BigInt(1)) / priceScaled
}

export function formatTokenUnits(units: bigint, decimals: number): string {
  if (units < BigInt(0) || !Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error('Cantidad de token inválida')
  }

  if (decimals === 0) return units.toString()

  const digits = units.toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, -decimals)
  const fraction = digits.slice(-decimals).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}


const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'
const MAX_COINGECKO_QUOTE_AGE_SECONDS = 600

type CoinGeckoPriceEntry = {
  usd?: unknown
  last_updated_at?: unknown
}

type CoinGeckoPriceResponse = Record<string, CoinGeckoPriceEntry>

export type WarsAnchoredPrice = {
  /** ARS-equivalent price per token, inferred from token USD / wARS USD. */
  priceArs: string
  warsPriceUsd: string
  tokenPriceUsd: string
  observedAt: Date
  source: 'coingecko-wars-anchor'
  sourceAssetId: string
}

/**
 * Uses CoinGecko's wARS/USD market reference as the ARS anchor.
 * Since wARS is designed to track ARS, implied ARS/token = token USD / wARS USD.
 * This is a market-derived reference, not a guaranteed execution price.
 */
export async function getWarsAnchoredTokenPrice(
  symbol: CryptoAssetSymbol
): Promise<WarsAnchoredPrice> {
  const assetIds: Record<CryptoAssetSymbol, string> = {
    USDC: 'usd-coin',
    USDT: 'tether',
    WLD: 'worldcoin-wld',
  }
  const tokenId = assetIds[symbol]
  const url = new URL(`${COINGECKO_BASE_URL}/simple/price`)
  url.searchParams.set('ids', `argentine-peso,${tokenId}`)
  url.searchParams.set('vs_currencies', 'usd')
  url.searchParams.set('include_last_updated_at', 'true')

  const headers: Record<string, string> = { accept: 'application/json' }
  const apiKey = process.env.COINGECKO_DEMO_API_KEY
  if (apiKey) headers['x-cg-demo-api-key'] = apiKey

  const response = await fetch(url.toString(), {
    cache: 'no-store',
    headers,
    signal: AbortSignal.timeout(6000),
  })
  if (!response.ok) {
    throw new Error(`CoinGecko respondió HTTP ${response.status}`)
  }

  const payload: unknown = await response.json()
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Respuesta inválida de CoinGecko')
  }

  const data = payload as CoinGeckoPriceResponse
  const wars = data['argentine-peso']
  const token = data[tokenId]
  const warsUsd = Number(wars?.usd)
  const tokenUsd = Number(token?.usd)
  const warsUpdatedAt = Number(wars?.last_updated_at)
  const tokenUpdatedAt = Number(token?.last_updated_at)

  if (![warsUsd, tokenUsd].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('CoinGecko no devolvió precios USD válidos para wARS y el activo seleccionado')
  }
  if (![warsUpdatedAt, tokenUpdatedAt].every((value) => Number.isInteger(value) && value > 0)) {
    throw new Error('CoinGecko no devolvió marcas de tiempo válidas para ambas cotizaciones')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const oldestUpdatedAt = Math.min(warsUpdatedAt, tokenUpdatedAt)
  if (
    warsUpdatedAt > nowSeconds + 30 ||
    tokenUpdatedAt > nowSeconds + 30 ||
    nowSeconds - oldestUpdatedAt > MAX_COINGECKO_QUOTE_AGE_SECONDS
  ) {
    throw new Error('La cotización de wARS o del activo de pago está desactualizada')
  }

  let impliedPriceArs: string
  try {
    impliedPriceArs = calculateWarsAnchoredPriceArs(warsUsd, tokenUsd)
  } catch {
    throw new Error('No se pudo calcular el precio del activo usando wARS como referencia')
  }

  return {
    priceArs: impliedPriceArs,
    warsPriceUsd: warsUsd.toFixed(12),
    tokenPriceUsd: tokenUsd.toFixed(12),
    observedAt: new Date(oldestUpdatedAt * 1000),
    source: 'coingecko-wars-anchor',
    sourceAssetId: tokenId,
  }
}

/** Pure calculation kept separate so the wARS anchor can be tested without network access. */
export function calculateWarsAnchoredPriceArs(warsPriceUsd: number, tokenPriceUsd: number): string {
  if (
    !Number.isFinite(warsPriceUsd) ||
    !Number.isFinite(tokenPriceUsd) ||
    warsPriceUsd <= 0 ||
    tokenPriceUsd <= 0
  ) {
    throw new Error('Los precios USD de wARS y del activo deben ser mayores que cero')
  }
  const priceArs = tokenPriceUsd / warsPriceUsd
  if (!Number.isFinite(priceArs) || priceArs <= 0) {
    throw new Error('No se pudo calcular el precio implícito en ARS')
  }
  return priceArs.toFixed(8)
}
