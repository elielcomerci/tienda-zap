import assert from 'node:assert/strict'
import {
  arsToCents,
  calculateTokenAmountUnits,
  formatTokenUnits,
} from '../src/lib/crypto/quotes'

assert.equal(arsToCents(123.45), 12345n)
assert.equal(
  calculateTokenAmountUnits(100000n, '1000.00000000', 6),
  1000000n,
  'ARS 1,000 at ARS 1,000 per token equals one 6-decimal token'
)
assert.equal(
  calculateTokenAmountUnits(100000n, '3000.00000000', 18),
  333333333333333334n,
  'token units round up so the quote never underpays the ARS order amount'
)
assert.equal(formatTokenUnits(333333333333333334n, 18), '0.333333333333333334')
assert.equal(formatTokenUnits(1000000n, 6), '1')
assert.throws(() => arsToCents(0))
assert.throws(() => calculateTokenAmountUnits(100n, '0', 6))

console.log('Crypto quote arithmetic tests passed')
