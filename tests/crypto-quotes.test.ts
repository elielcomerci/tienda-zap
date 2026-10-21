import assert from 'node:assert/strict'
import {
  arsToCents,
  calculateTokenAmountUnits,
  formatTokenUnits,\n  calculateWarsAnchoredPriceArs,
} from '../src/lib/crypto/quotes'

assert.equal(arsToCents(123.45), BigInt(12345))\nassert.equal(calculateWarsAnchoredPriceArs(0.0007, 1.2), '1714.28571429')\nassert.equal(calculateWarsAnchoredPriceArs(0.0007, 1), '1428.57142857')\nassert.throws(() => calculateWarsAnchoredPriceArs(0, 1))
assert.equal(
  calculateTokenAmountUnits(BigInt(100000), '1000.00000000', 6),
  BigInt(1000000),
  'ARS 1,000 at ARS 1,000 per token equals one 6-decimal token'
)
assert.equal(
  calculateTokenAmountUnits(BigInt('100000'), '3000.00000000', 18),
  BigInt('333333333333333334'),
  'token units round up so the quote never underpays the ARS order amount'
)
assert.equal(formatTokenUnits(BigInt('333333333333333334'), 18), '0.333333333333333334')
assert.equal(formatTokenUnits(BigInt('1000000'), 6), '1')
assert.throws(() => arsToCents(0))
assert.throws(() => calculateTokenAmountUnits(BigInt(100), '0', 6))

console.log('Crypto quote arithmetic tests passed')
