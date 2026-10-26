import { Prisma } from '@prisma/client'

export const FISCAL_INVOICE_BATCH_ITEM_STATUSES = [
  'INVALID',
  'READY',
  'PROCESSING',
  'UNKNOWN',
  'AUTHORIZED',
  'REJECTED',
] as const

export type FiscalInvoiceBatchItemStatus = typeof FISCAL_INVOICE_BATCH_ITEM_STATUSES[number]

function parseFiscalInvoiceBatchItemStatus(value: string): FiscalInvoiceBatchItemStatus | null {
  switch (value) {
    case 'INVALID':
    case 'READY':
    case 'PROCESSING':
    case 'UNKNOWN':
    case 'AUTHORIZED':
    case 'REJECTED':
      return value
    default:
      return null
  }
}

export function getFiscalInvoiceBatchStatus(statuses: readonly FiscalInvoiceBatchItemStatus[]): string {
  if (statuses.some(status => status === 'PROCESSING')) return 'PROCESSING'
  if (statuses.some(status => status === 'UNKNOWN')) return 'NEEDS_RECONCILIATION'
  if (statuses.some(status => status === 'INVALID') && statuses.some(status => status === 'READY')) return 'NEEDS_CORRECTION'
  if (statuses.some(status => status === 'READY')) return 'READY'
  if (statuses.some(status => status === 'INVALID')) return 'NEEDS_CORRECTION'
  if (statuses.every(status => status === 'AUTHORIZED')) return 'COMPLETED'
  return 'COMPLETED_WITH_ERRORS'
}

export function getFiscalInvoiceBatchItemStatusFromJob(status: string | undefined, cae: string | undefined): FiscalInvoiceBatchItemStatus {
  if (status === 'DONE') return cae ? 'AUTHORIZED' : 'UNKNOWN'
  if (status === 'FAILED' || status === 'DEAD') return 'REJECTED'
  return 'PROCESSING'
}

export async function refreshFiscalInvoiceBatchStatus(
  transaction: Prisma.TransactionClient,
  accountId: string,
  batchId: string,
): Promise<void> {
  const [items, batch] = await Promise.all([
    transaction.fiscalInvoiceBatchItem.findMany({
    where: { accountId, batchId },
    select: { status: true },
    }),
    transaction.fiscalInvoiceBatch.findFirst({ where: { id: batchId, accountId }, select: { completedAt: true } }),
  ])
  const statuses = items.map(item => parseFiscalInvoiceBatchItemStatus(item.status) ?? 'UNKNOWN')
  const status = getFiscalInvoiceBatchStatus(statuses)
  const terminal = status === 'COMPLETED' || status === 'COMPLETED_WITH_ERRORS'

  await transaction.fiscalInvoiceBatch.updateMany({
    where: { id: batchId, accountId },
    data: { status, completedAt: terminal ? batch?.completedAt ?? new Date() : null },
  })
}
