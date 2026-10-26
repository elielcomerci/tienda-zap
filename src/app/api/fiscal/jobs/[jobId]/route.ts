import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resolveFiscalAccount, fiscalApiRequest } from '@/lib/fiscal-account-access'
import { getFiscalInvoiceBatchItemStatusFromJob, refreshFiscalInvoiceBatchStatus } from '@/lib/fiscal-invoice-batches'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ jobId: string }> }
type JobResult = {
  jobId?: string
  status?: string
  voucher?: { id?: string; voucherType?: number; voucherNumber?: number; cae?: string; caeFchVto?: string; issuedAt?: string; documentSnapshot?: unknown }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseDate(value: string | undefined) {
  if (!value) return null
  const date = /^\d{8}$/.test(value)
    ? new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`)
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest, context: Context) {
  const access = await resolveFiscalAccount(request)
  if ('response' in access) return access.response
  const { jobId } = await context.params
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(jobId)) return NextResponse.json({ error: 'ID de trabajo inválido.' }, { status: 422 })

  const response = await fiscalApiRequest(request, `/v1/jobs/${encodeURIComponent(jobId)}`, access.apiKey)
  if (!response.ok) return response
  const result = await response.clone().json().catch(() => ({})) as JobResult
  if (result.jobId) {
    const record = await prisma.fiscalInvoiceRecord.findFirst({ where: { accountId: access.account.id, jobId } })
    if (record) {
      try {
        const previousPayload = isRecord(record.payload) ? record.payload : {}
        const snapshot = isRecord(result.voucher?.documentSnapshot) ? result.voucher.documentSnapshot : null
        const payload = snapshot
          ? JSON.parse(JSON.stringify({ ...previousPayload, documentSnapshot: snapshot })) as import('@prisma/client').Prisma.InputJsonValue
          : undefined
        await prisma.$transaction(async transaction => {
          await transaction.fiscalInvoiceRecord.update({
            where: { id: record.id },
            data: {
              result: result.status || record.result,
              workerVoucherId: result.voucher?.id ?? record.workerVoucherId,
              voucherType: result.voucher?.voucherType ?? record.voucherType,
              voucherNumber: result.voucher?.voucherNumber ?? record.voucherNumber,
              cae: result.voucher?.cae ?? record.cae,
              caeExpiresAt: parseDate(result.voucher?.caeFchVto) ?? record.caeExpiresAt,
              ...(payload ? { payload } : {}),
            },
          })
          const batchItem = await transaction.fiscalInvoiceBatchItem.findFirst({ where: { accountId: access.account.id, jobId }, select: { id: true, batchId: true } })
          if (batchItem) {
            const itemStatus = getFiscalInvoiceBatchItemStatusFromJob(result.status, result.voucher?.cae)
            await transaction.fiscalInvoiceBatchItem.update({
              where: { id: batchItem.id },
              data: {
                status: itemStatus,
                invoiceRecordId: record.id,
                errorCode: itemStatus === 'UNKNOWN' ? 'WORKER_RESULT_INCOMPLETE' : null,
                errorMessage: itemStatus === 'UNKNOWN' ? 'El trabajo terminó sin un CAE confirmado. Revisá el comprobante antes de continuar.' : null,
                resolvedAt: itemStatus === 'AUTHORIZED' || itemStatus === 'REJECTED' ? new Date() : null,
              },
            })
            await refreshFiscalInvoiceBatchStatus(transaction, access.account.id, batchItem.batchId)
          }
        })
      } catch (error) {
        console.error('[fiscal/jobs] invoice sync failed', error instanceof Error ? error.name : 'UnknownError')
      }
    }
  }
  return response
}
