import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getFiscalInvoiceBatchItemStatusFromJob, getFiscalInvoiceBatchStatus } from '../src/lib/fiscal-invoice-batches'

test('batch remains ready until all rows are terminal', () => {
  assert.equal(getFiscalInvoiceBatchStatus(['AUTHORIZED', 'READY']), 'READY')
  assert.equal(getFiscalInvoiceBatchStatus(['AUTHORIZED', 'PROCESSING']), 'PROCESSING')
})

test('uncertain rows require reconciliation and are not treated as authorized', () => {
  assert.equal(getFiscalInvoiceBatchItemStatusFromJob('DONE', undefined), 'UNKNOWN')
  assert.equal(getFiscalInvoiceBatchStatus(['AUTHORIZED', 'UNKNOWN']), 'NEEDS_RECONCILIATION')
})

test('batch completion reflects individual authorization results', () => {
  assert.equal(getFiscalInvoiceBatchItemStatusFromJob('DONE', '12345678901234'), 'AUTHORIZED')
  assert.equal(getFiscalInvoiceBatchItemStatusFromJob('FAILED', undefined), 'REJECTED')
  assert.equal(getFiscalInvoiceBatchStatus(['AUTHORIZED', 'AUTHORIZED']), 'COMPLETED')
  assert.equal(getFiscalInvoiceBatchStatus(['AUTHORIZED', 'REJECTED']), 'COMPLETED_WITH_ERRORS')
  assert.equal(getFiscalInvoiceBatchStatus(['INVALID']), 'NEEDS_CORRECTION')
})
