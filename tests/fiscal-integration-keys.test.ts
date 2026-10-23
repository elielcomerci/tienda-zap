import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildIntegrationApiKeyLabel, getIntegrationKeyInventoryError } from '../src/lib/fiscal-integration-keys'

const now = new Date('2026-10-22T12:00:00.000Z')
const active = (id: string, label = `Integración: app-${id} (python)`) => ({ id, label, expiresAt: null, revokedAt: null })

test('integration labels fit the Worker limit even for long project names', () => {
  const label = buildIntegrationApiKeyLabel('x'.repeat(80), 'node-typescript')
  assert.ok(label.length <= 80)
  assert.ok(label.startsWith('Integración: '))
})

test('key creation allows fewer than ten active keys and rejects the normal limit', () => {
  assert.equal(getIntegrationKeyInventoryError(Array.from({ length: 9 }, (_, index) => active(String(index))), null, now), null)
  assert.equal(getIntegrationKeyInventoryError(Array.from({ length: 10 }, (_, index) => active(String(index))), null, now), 'API_KEY_LIMIT_REACHED')
})

test('rotation can replace one of ten keys while keeping the old key available', () => {
  const keys = Array.from({ length: 10 }, (_, index) => active(String(index)))
  assert.equal(getIntegrationKeyInventoryError(keys, '0', now), null)
  assert.equal(getIntegrationKeyInventoryError(keys, 'unknown', now), 'ROTATION_KEY_NOT_AVAILABLE')
  assert.equal(getIntegrationKeyInventoryError([{ ...active('0'), label: 'Initial service key' }], '0', now), 'ROTATION_KEY_NOT_AVAILABLE')
})

test('expired and revoked keys do not consume the active-key limit', () => {
  const keys = Array.from({ length: 10 }, (_, index) => active(String(index)))
  keys[0] = { ...keys[0]!, expiresAt: '2026-10-22T11:59:59.000Z' }
  keys[1] = { ...keys[1]!, revokedAt: '2026-10-22T11:00:00.000Z' }
  assert.equal(getIntegrationKeyInventoryError(keys, null, now), null)
})
