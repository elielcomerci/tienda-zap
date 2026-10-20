import assert from 'node:assert/strict'
import {
  CRYPTO_PAYMENT_NETWORKS,
  ENABLED_CRYPTO_PAYMENT_NETWORKS,
  getEnabledCryptoAsset,
} from '../src/lib/crypto/networks'

assert.deepEqual(
  ENABLED_CRYPTO_PAYMENT_NETWORKS.map((network) => network.chainId),
  [8453, 10, 480],
  'only Base, Optimism and World Chain should be exposed in the first rollout'
)

assert.equal(getEnabledCryptoAsset(8453, 'USDC')?.asset.contractAddress.toLowerCase(),
  '0x833589fc d6edb6e08f4c7c32d4f71b54bda02913'.replaceAll(' ', ''),
  'Base accepts native Circle USDC'
)
assert.equal(getEnabledCryptoAsset(10, 'USDC')?.asset.decimals, 6)
assert.equal(getEnabledCryptoAsset(10, 'WLD'), null, 'Optimism WLD is not enabled in the initial rollout')
assert.equal(getEnabledCryptoAsset(480, 'WLD')?.asset.contractAddress.toLowerCase(), '0x2cfc85d8e48f8eab294be644d9e25c3030863003')
assert.equal(getEnabledCryptoAsset(480, 'WLD')?.asset.decimals, 18)
assert.equal(getEnabledCryptoAsset(10, 'USDT'), null, 'USDT remains disabled pending issuer-contract verification')
assert.equal(getEnabledCryptoAsset(137, 'USDC'), null, 'Polygon remains disabled in the initial rollout')

const activeAssets = CRYPTO_PAYMENT_NETWORKS.flatMap((network) =>
  Object.entries(network.assets)
    .filter(([, asset]) => asset?.enabled)
    .map(([symbol, asset]) => `${network.chainId}:${symbol}:${asset?.contractAddress.toLowerCase()}`)
)
assert.equal(new Set(activeAssets).size, activeAssets.length, 'enabled chain/token pairs must be unique')

console.log('Crypto network allowlist tests passed')
