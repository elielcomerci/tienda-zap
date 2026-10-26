import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyFiscalFeatureGates } from '../src/lib/fiscal-feature-flag-policy'

const allEnabled = {
  accountProvisioning: true,
  contributorManagement: true,
  apiKeyManagement: true,
  certificateManagement: true,
  invoiceEmissionTest: true,
  invoiceEmissionProd: true,
  batchImport: true,
  pdfExport: true,
  manualInvoiceRegistration: true,
  wsfeRead: true,
  padronQuery: true,
  invoiceVoid: true,
  jobReconciliation: true,
  usageVisibility: true,
  operationalRecovery: true,
} as const

test('production invoice emission remains disabled without deployment opt-in even when the database flag is true', () => {
  const flags = applyFiscalFeatureGates({ ...allEnabled }, false, true)
  assert.equal(flags.invoiceEmissionProd, false)
  assert.equal(flags.invoiceEmissionTest, true)
  assert.equal(flags.apiKeyManagement, true)
})

test('production invoice emission requires both the database flag and deployment opt-in', () => {
  assert.equal(applyFiscalFeatureGates({ ...allEnabled }, true, true).invoiceEmissionProd, true)
  assert.equal(applyFiscalFeatureGates({ ...allEnabled, invoiceEmissionProd: false }, true, true).invoiceEmissionProd, false)
})


test('production invoice emission remains disabled when the database flag row is missing', () => {
  assert.equal(applyFiscalFeatureGates({ ...allEnabled }, true, false).invoiceEmissionProd, false)
})
