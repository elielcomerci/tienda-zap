/**
 * Explicit allowlist for the first crypto-checkout rollout.
 *
 * Never infer support from a token symbol alone: chainId + contract address
 * identify the asset that the backend is allowed to verify.
 *
 * Contract addresses below are sourced from issuer documentation:
 * - USDC: Circle's official multichain documentation.
 * - WLD: World whitepaper tokenomics.
 * USDT contracts must be re-verified against the issuer's current canonical
 * deployment before enabling a network in production.
 */

export type CryptoAssetSymbol = 'USDC' | 'USDT' | 'WLD'

export type CryptoPaymentNetwork = {
  chainId: number
  key: 'base' | 'optimism' | 'polygon'
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: 18
  }
  explorerUrl: string
  assets: Partial<
    Record<
      CryptoAssetSymbol,
      {
        contractAddress: `0x${string}`
        decimals: number
        issuer: 'Circle' | 'Tether' | 'World'
        enabled: boolean
      }
    >
  >
}

/**
 * Initial production allowlist.
 *
 * Base: native USDC only.
 * Optimism: native USDC and the official WLD deployment. USDT remains
 * disabled until its canonical contract is independently verified.
 * Polygon: intentionally not enabled yet; it adds another RPC, monitoring,
 * and support surface without enabling WLD.
 */
export const CRYPTO_PAYMENT_NETWORKS: readonly CryptoPaymentNetwork[] = [
  {
    chainId: 8453,
    key: 'base',
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://basescan.org',
    assets: {
      USDC: {
        contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        decimals: 6,
        issuer: 'Circle',
        enabled: true,
      },
    },
  },
  {
    chainId: 10,
    key: 'optimism',
    name: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://optimistic.etherscan.io',
    assets: {
      USDC: {
        contractAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
        decimals: 6,
        issuer: 'Circle',
        enabled: true,
      },
      WLD: {
        contractAddress: '0xdC6fF44d5d932Cbd77B52E5612Ba0529DC6226F1',
        decimals: 18,
        issuer: 'World',
        enabled: true,
      },
      USDT: {
        contractAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
        decimals: 6,
        issuer: 'Tether',
        enabled: false,
      },
    },
  },
  {
    chainId: 137,
    key: 'polygon',
    name: 'Polygon PoS',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    explorerUrl: 'https://polygonscan.com',
    assets: {
      USDC: {
        contractAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
        decimals: 6,
        issuer: 'Circle',
        enabled: true,
      },
      USDT: {
        contractAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        decimals: 6,
        issuer: 'Tether',
        enabled: false,
      },
    },
  },
] as const

export const ENABLED_CRYPTO_PAYMENT_NETWORKS = CRYPTO_PAYMENT_NETWORKS.filter(
  (network) => Object.values(network.assets).some((asset) => asset?.enabled)
)

export function getEnabledCryptoAsset(chainId: number, symbol: CryptoAssetSymbol) {
  const network = CRYPTO_PAYMENT_NETWORKS.find((candidate) => candidate.chainId === chainId)
  const asset = network?.assets[symbol]

  if (!network || !asset?.enabled) return null

  return { network, asset }
}
